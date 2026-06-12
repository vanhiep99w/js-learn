---
title: "async / await"
description: "Đào sâu async/await từ trực giác đến internal: async function luôn trả Promise (resolve theo return, reject theo throw), await tạm dừng (suspend) hàm và trả quyền cho caller, desugar await thành .then microtask, mô hình thực thi theo event loop, try/catch/finally bắt lỗi async, phân biệt tuần tự vs đồng thời vs song song (sequential/concurrent/parallel), await trong vòng lặp và forEach, top-level await, cùng anti-patterns. Kèm trace table và ví dụ chạy được."
---

> [!NOTE]
> `async/await` là *cú pháp* viết trên nền [Promises](/async/promises/) — không phải cơ chế mới. Hiểu Promise + [Event Loop](/async/event-loop/) (microtask) là điều kiện để hiểu chính xác bài này.

## Mục lục

- [Trực giác: viết async như sync](#trực-giác-viết-async-như-sync)
- [async function luôn trả về Promise](#async-function-luôn-trả-về-promise)
- [await — tạm dừng và trả quyền](#await-tạm-dừng-và-trả-quyền)
- [Internal: await desugar thành .then](#internal-await-desugar-thành-then)
- [Mô hình thực thi theo event loop](#mô-hình-thực-thi-theo-event-loop)
- [try / catch / finally](#try-catch-finally)
- [Tuần tự vs Đồng thời vs Song song](#tuần-tự-vs-đồng-thời-vs-song-song)
- [await trong vòng lặp & forEach](#await-trong-vòng-lặp-foreach)
- [Top-level await](#top-level-await)
- [Anti-patterns](#anti-patterns)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Trực giác: viết async như sync

`async/await` cho ta viết code bất đồng bộ **trông như đồng bộ** — đọc tuần tự từ trên xuống, không còn `.then()` lồng nhau:

```js
// Promise thuần
function layData() {
  return dangNhap().then((t) => layHoSo(t)).then((h) => h.ten);
}

// async/await — cùng logic, đọc như sync
async function layData() {
  const t = await dangNhap();
  const h = await layHoSo(t);
  return h.ten;
}
```

Cùng một thứ, nhưng bản `async/await` gần với cách ta *suy nghĩ* hơn: "đăng nhập, rồi lấy hồ sơ, rồi lấy tên".

---

## async function luôn trả về Promise

Đặt `async` trước một hàm thì hàm đó **luôn trả về một Promise**, bất kể bên trong return gì:

- `return value` → Promise **fulfilled** với `value`.
- `throw error` (hoặc lỗi không bắt) → Promise **rejected** với `error`.
- Nếu `return` một Promise → nó được *flatten* (chờ Promise đó).

```js
async function f() { return 1; }
f(); // Promise {<fulfilled>: 1}
f().then((v) => console.log(v)); // 1

async function g() { throw new Error('bùm'); }
g(); // Promise {<rejected>: Error: bùm}
g().catch((e) => console.log(e.message)); // bùm
```

> [!IMPORTANT]
> Vì `async` function trả Promise, **gọi nó không "chờ" gì cả** — nó trả về Promise ngay lập tức. Muốn lấy giá trị, bạn `await` nó (trong async khác) hoặc `.then` nó.

---

## await — tạm dừng và trả quyền

`await` đặt trước một Promise (hoặc giá trị thường). Nó:

1. **Tạm dừng (suspend)** hàm `async` hiện tại tại đúng dòng đó.
2. **Trả quyền điều khiển về cho caller** — code *bên ngoài* hàm async chạy tiếp (không block!).
3. Khi Promise **settle**, hàm async được **resume**: `await` *trả về value* (nếu fulfilled) hoặc *ném reason* (nếu rejected), rồi chạy tiếp các dòng sau.

```js
function resolveSau2s() {
  return new Promise((res) => setTimeout(() => res('xong'), 2000));
}

async function asyncCall() {
  console.log('gọi');
  const result = await resolveSau2s(); // suspend ở đây ~2s, KHÔNG block luồng chính
  console.log(result);                 // 'xong' (sau 2s)
}

asyncCall();
console.log('sau khi gọi'); // chạy NGAY, trước 'xong'
// gọi
// sau khi gọi
// xong   (sau 2s)
```

> [!WARNING]
> `await` chỉ dùng được **bên trong `async` function** (hoặc [top-level trong module](#top-level-await)). Dùng `await` ở hàm thường → lỗi cú pháp.

---

## Internal: await desugar thành .then

`async/await` thực chất là **đường cú pháp (syntactic sugar)** trên Promise + một cơ chế giống generator (tạm dừng/khôi phục hàm). Mỗi `await` chia hàm thành các "đoạn", và phần *sau* mỗi `await` được bọc vào một **`.then()`** — tức chạy như **microtask**.

```js
// Bạn viết:
async function f() {
  const a = await p1;
  console.log(a);
  const b = await p2;
  console.log(b);
}

// Engine hiểu (đại ý):
function f() {
  return Promise.resolve(p1).then((a) => {
    console.log(a);
    return Promise.resolve(p2).then((b) => {
      console.log(b);
    });
  });
}
```

Vì "phần tiếp theo sau `await`" là một microtask, nó tuân đúng thứ tự ưu tiên của event loop (microtask trước macrotask). Đây là chìa khoá để dự đoán output trộn `await`, `setTimeout`, `.then`.

> [!NOTE]
> Mỗi hàm `async` được "bọc" trong một Promise lớn. Mỗi khi gặp `await`, phần code phía dưới được đặt vào một `then()` của Promise đang chờ — nên mọi thứ vẫn chạy **tuần tự từ trên xuống** *trong* hàm, dù thực chất là chuỗi microtask.

---

## Mô hình thực thi theo event loop

```js
console.log('1');

async function f() {
  console.log('2');           // chạy ĐỒNG BỘ tới await đầu tiên
  await null;                 // suspend → phần dưới thành microtask
  console.log('4');           // microtask
}

f();
console.log('3');
// Output: 1 2 3 4
```

Diễn giải:
1. `console.log('1')` — đồng bộ.
2. Gọi `f()`: thân hàm chạy đồng bộ tới `await` → in `2`. Gặp `await null` → **suspend**, trả quyền ra ngoài.
3. `console.log('3')` — đồng bộ (caller chạy tiếp).
4. Code đồng bộ xong → drain microtask → resume `f` → in `4`.

Trace với cả `setTimeout`:

```js
console.log('A');
setTimeout(() => console.log('timeout'), 0); // macrotask
(async () => {
  console.log('B');
  await null;
  console.log('C'); // microtask
})();
console.log('D');
// A B D C timeout
```

| Bước | Hàng đợi | Output |
| --- | --- | --- |
| code đồng bộ | — | A, B, D |
| sau `await` (resume) | microtask | C |
| timer hết giờ | macrotask | timeout |

---

## try / catch / finally

Vì `await` *ném* khi Promise reject, ta bắt lỗi async bằng `try/catch` *bình thường* — điều mà callback không làm được:

```js
async function layData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Lỗi:', err.message);
    return null; // giá trị fallback
  } finally {
    console.log('luôn chạy — cleanup ở đây');
  }
}
```

> [!IMPORTANT]
> `try/catch` quanh `await` chỉ bắt được lỗi của **những `await` nằm trong khối `try`**. Một Promise tạo ra mà *không* được `await` (hoặc await ngoài try) thì lỗi của nó *không* bị bắt ở đây.

---

## Tuần tự vs Đồng thời vs Song song

Đây là phần dễ sai nhất. Cùng hai tác vụ (chậm 2s, nhanh 1s), ba cách viết cho ba kết quả thời gian khác nhau.

**1) Tuần tự (sequential) — chậm nhất (~3s):** `await` cái đầu *trước khi cả khởi tạo* cái sau.

```js
async function sequential() {
  const slow = await resolveAfter2s(); // bắt đầu timer 2s, CHỜ xong
  const fast = await resolveAfter1s(); // chỉ bắt đầu SAU khi slow xong → +1s
  // tổng ~3s
}
```

**2) Đồng thời (concurrent) — ~2s:** *khởi tạo* cả hai Promise trước (timer chạy gần như cùng lúc), rồi mới `await`.

```js
async function concurrent() {
  const slowP = resolveAfter2s(); // timer bắt đầu NGAY
  const fastP = resolveAfter1s(); // timer bắt đầu NGAY
  const slow = await slowP;       // chờ 2s
  const fast = await fastP;       // đã xong từ 1s → lấy ngay
  // tổng ~2s
}
```

**3) Song song (parallel) với `Promise.all` — ~2s, gọn & an toàn nhất:**

```js
async function parallel() {
  const [slow, fast] = await Promise.all([
    resolveAfter2s(),
    resolveAfter1s(),
  ]);
  // tổng ~2s; nếu một cái reject → Promise.all reject ngay
}
```

Hình dung trên trục thời gian (timer 2s và 1s):

```text
Tuần tự (~3s):   slow ████████ (2s) ─→ fast ████ (1s)
                 0s              2s          3s

Đồng thời (~2s): slow ████████ (2s)
                 fast ████ (1s)          ← chạy CHỒNG lên nhau
                 0s          1s   2s
```

Khác biệt mấu chốt: bản tuần tự chỉ *bắt đầu* timer của `fast` **sau khi** `slow` đã xong (vì `await` chặn ngay dòng đó), nên hai timer nối đuôi nhau (2+1=3s). Bản đồng thời *khởi tạo cả hai timer ngay*, nên chúng chạy chồng lên nhau và tổng thời gian chỉ bằng cái lâu nhất (~2s).

| Cách viết | Thời gian | Khi nào dùng |
| --- | --- | --- |
| `await` lần lượt từng lời gọi | ~3s (tổng) | Khi bước sau **cần kết quả** bước trước |
| Khởi tạo trước rồi `await` | ~2s (max) | Các tác vụ **độc lập** nhưng cần xử lý riêng |
| `await Promise.all([...])` | ~2s (max) | Các tác vụ **độc lập**, muốn gom kết quả |

> [!WARNING]
> Sai lầm phổ biến: `await` ngay trong lúc khởi tạo các tác vụ độc lập → biến chúng thành **tuần tự** không cần thiết, kéo dài tổng thời gian. Nếu không phụ thuộc nhau, hãy `Promise.all`.

---

## await trong vòng lặp & forEach

**`for...of` + `await` = tuần tự** (mỗi vòng chờ vòng trước):

```js
for (const url of urls) {
  const res = await fetch(url); // chờ từng cái — tuần tự
  console.log(await res.text());
}
```

Nếu các vòng độc lập, dùng `map` + `Promise.all` để **song song**:

```js
const results = await Promise.all(urls.map((u) => fetch(u)));
```

> [!WARNING]
> **`await` trong `forEach` KHÔNG hoạt động như mong đợi.** `forEach` *không* chờ Promise của callback — nó gọi tất cả callback rồi return ngay, "nuốt" mất các Promise:
> ```js
> urls.forEach(async (u) => {
>   const r = await fetch(u);     // forEach KHÔNG chờ cái này
>   console.log(await r.text());
> });
> console.log('chạy NGAY, trước mọi fetch'); // sai thứ tự
> ```
> Dùng `for...of` (tuần tự) hoặc `Promise.all(map(...))` (song song) thay cho `forEach`.

---

## Top-level await

Trong **ES modules**, có thể dùng `await` ở cấp cao nhất (ngoài mọi hàm):

```js
// trong file .mjs hoặc <script type="module">
const config = await fetch('/config.json').then((r) => r.json());
console.log(config);
```

> [!NOTE]
> Top-level await *chỉ* trong module, **không** trong script thường/CommonJS. Nó làm module trở thành "async" — các module import nó sẽ chờ nó hoàn tất trước khi chạy.

---

## Anti-patterns

| Anti-pattern | Vì sao tệ | Nên làm |
| --- | --- | --- |
| `await` tuần tự các tác vụ độc lập | Chậm không cần thiết | `Promise.all([...])` |
| `await` trong `forEach` | forEach không chờ | `for...of` hoặc `Promise.all(map)` |
| Quên `await` (chỉ gọi async fn) | Nhận Promise thay vì value; lỗi bị nuốt | Thêm `await` |
| `return await x` thừa (cuối hàm) | Thêm một microtask không cần | `return x` (trừ khi trong `try`) |
| Không `try/catch` quanh await | Unhandled rejection | Bọc `try/catch` hoặc `.catch` |
| Trộn `await` và `.then` lộn xộn | Khó đọc, dễ sai thứ tự | Chọn một phong cách nhất quán |

```js
// ❌ quên await — 'data' là Promise, không phải dữ liệu
const data = layData();
console.log(data.ten); // undefined / lỗi

// ✅
const data = await layData();
console.log(data.ten);
```

---

## Tự kiểm tra

> [!NOTE]
> **Câu hỏi:** Output theo thứ tự nào?
> ```js
> console.log('1');
> async function f() {
>   console.log('2');
>   await null;
>   console.log('3');
> }
> f();
> Promise.resolve().then(() => console.log('4'));
> console.log('5');
> ```

> [!TIP]
> **Đáp án:** `1 2 5 3 4`.
> - `1` — đồng bộ.
> - `f()` chạy đồng bộ tới `await` → in `2`, rồi gặp `await null` → lên lịch phần còn lại (`3`) vào **microtask queue** và suspend.
> - Tiếp đến dòng `Promise.resolve().then(...)` → lên lịch `4` vào microtask queue (**sau** `3`).
> - `5` — đồng bộ.
> - Code đồng bộ xong → drain microtask **theo thứ tự đăng ký**: `3` trước, rồi `4`.

---

## Cheat sheet

> [!IMPORTANT]
> 1. `async` function **luôn trả Promise** (resolve theo `return`, reject theo `throw`).
> 2. `await` **suspend** hàm async và **trả quyền** cho caller (không block luồng chính); resume khi Promise settle.
> 3. Phần code sau `await` chạy như **microtask** (await ≈ `.then`).
> 4. Bắt lỗi async bằng `try/catch/finally` quanh `await`.
> 5. Tác vụ **độc lập** → `Promise.all`, đừng `await` tuần tự. Bước **phụ thuộc** → `await` lần lượt.
> 6. **Đừng** `await` trong `forEach`; dùng `for...of` (tuần tự) hoặc `Promise.all(map)` (song song).

---

## Bài liên quan

- [Promises](/async/promises/)
- [Callbacks & Callback Hell](/async/callbacks/)
- [Event Loop — Deep Dive](/async/event-loop/)
- [Hàm cơ bản](/function-closure/function-basics/)
