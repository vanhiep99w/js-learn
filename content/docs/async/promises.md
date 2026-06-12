---
title: "Promises"
description: "Đào sâu Promise từ trực giác đến internal: producing vs consuming code, executor chạy đồng bộ ngay khi new, 3 trạng thái pending/fulfilled/rejected và tính bất biến, internal slots ([[PromiseState]], [[PromiseResult]], [[PromiseFulfillReactions]]), then/catch/finally luôn trả Promise mới và quy tắc giá trị trả về, chaining & flattening, then-callback chạy như microtask, deferred pattern, combinator all/allSettled/any/race, xử lý lỗi và unhandledrejection. Kèm trace table và anti-patterns."
---

> [!NOTE]
> Bài này nối tiếp [Callbacks & Callback Hell](/async/callbacks/). Promise sinh ra để giải quyết *callback hell* và *inversion of control*. Phần "khi nào then-callback thực sự chạy" dựa trên [Event Loop — Deep Dive](/async/event-loop/) (microtask).

## Mục lục

- [Trực giác: lời hứa](#trực-giác-lời-hứa)
- [Producing code vs Consuming code](#producing-code-vs-consuming-code)
- [new Promise & executor chạy đồng bộ](#new-promise-executor-chạy-đồng-bộ)
- [Ba trạng thái & tính bất biến](#ba-trạng-thái-tính-bất-biến)
- [Internal: Promise trông như thế nào bên trong](#internal-promise-trông-như-thế-nào-bên-trong)
- [then / catch / finally](#then-catch-finally)
- [Chaining & flattening](#chaining-flattening)
- [then-callback là microtask](#then-callback-là-microtask)
- [Deferred pattern](#deferred-pattern)
- [Combinator: all / allSettled / any / race](#combinator-all-allsettled-any-race)
- [Xử lý lỗi](#xử-lý-lỗi)
- [Anti-patterns](#anti-patterns)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Trực giác: lời hứa

`Promise` đúng như tên gọi — một **lời hứa**:

> "Tôi *hứa* rằng nếu **bài kiểm tra ngày mai trên 8 điểm** thì tôi sẽ **bao bạn đi ăn**; nếu không, tôi sẽ **không chơi game một tuần**."

Lời hứa này có đủ thành phần của một Promise:
- Một **hành động cần thời gian** mới biết kết quả (bài kiểm tra ngày mai).
- Một nhánh **thành công** (`resolve` → bao đi ăn).
- Một nhánh **thất bại** (`reject` → không chơi game).

Quan trọng: **ngay lúc hứa**, bạn chưa biết kết quả — lời hứa đang ở trạng thái *chờ* (`pending`). Bạn có thể *gắn sẵn* phản ứng ("nếu được thì..., nếu không thì...") và chúng sẽ tự kích hoạt khi lời hứa ngã ngũ.

---

## Producing code vs Consuming code

Một Promise chia thế giới làm hai phần:

- **Producing code** (code sản xuất): đoạn cần thời gian để chạy — fetch dữ liệu, đọc file, đếm giờ — và *quyết định* thành công (`resolve(value)`) hay thất bại (`reject(error)`).
- **Consuming code** (code tiêu thụ): đoạn *nhận kết quả* từ producing code và thực hiện hành động tương ứng — chính là các `.then()`, `.catch()`.

```js
const promise = new Promise((resolve, reject) => {
  // ─── Producing code ───
  fetchData((err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});

// ─── Consuming code ───
promise
  .then((data) => console.log('Thành công:', data))
  .catch((err) => console.error('Thất bại:', err));
```

Hàm truyền vào `new Promise` gọi là **executor** — nó *là* producing code.

---

## new Promise & executor chạy đồng bộ

Có một sự thật hay bị bỏ qua: **executor chạy NGAY và ĐỒNG BỘ** tại thời điểm `new Promise(...)`, *không* phải async.

```js
console.log('A');
const p = new Promise((resolve) => {
  console.log('B');     // ← chạy NGAY, đồng bộ, trước cả "C"
  resolve(1);
});
console.log('C');
p.then((v) => console.log('D', v)); // ← callback này mới là async (microtask)
// Output: A B C D 1
```

Executor nhận hai tham số — đều là **callback do chính Promise tự truyền vào**:
- `resolve(value)`: gọi khi tác vụ *thành công*.
- `reject(error)`: gọi khi tác vụ *thất bại*.

> [!IMPORTANT]
> Phân biệt rõ: **thân executor** chạy đồng bộ ngay; nhưng **callback trong `.then()`** luôn chạy bất đồng bộ (microtask). Đây là điểm khiến nhiều người dự đoán sai output.

Hệ quả thực tế (từ ghi chú gốc): nếu bạn tạo Promise *bên ngoài* thì các executor chạy **đồng thời**:

```js
const pm1 = new Promise((res) => setTimeout(() => res(5), 5000));
const pm2 = new Promise((res) => setTimeout(() => res(3), 3000));
// Cả hai timer đã bắt đầu đếm NGAY khi new → tổng thời gian ~5s
pm1.then((v1) => pm2.then((v2) => console.log(v1 + v2))); // 8 sau ~5s

// Nhưng nếu DỜI việc tạo pm2 vào trong then của pm1:
const pa = new Promise((res) => setTimeout(() => res(5), 5000));
pa.then((v1) =>
  new Promise((res) => setTimeout(() => res(3), 3000)) // chỉ tạo SAU 5s
    .then((v2) => console.log(v1 + v2))                 // → tổng ~8s
);
```

Bài học: muốn nhiều tác vụ chạy song song, **khởi tạo Promise sớm** (trước khi `await`/`then`), đừng tạo lồng nhau.

---

## Ba trạng thái & tính bất biến

Một Promise luôn ở **đúng một** trong ba trạng thái:

```
            ┌─────────── resolve(value) ──────────►  fulfilled  (đã có value)
 pending ───┤
            └─────────── reject(error)  ──────────►  rejected   (đã có error)
```

- **pending**: chưa `resolve` cũng chưa `reject` (đang chờ).
- **fulfilled**: đã `resolve` — mang một *value*.
- **rejected**: đã `reject` — mang một *error/reason*.

```js
console.log(new Promise((res) => res(1)));      // Promise {<fulfilled>: 1}
console.log(new Promise((_, rej) => rej('E'))); // Promise {<rejected>: 'E'}
console.log(new Promise(() => {}));             // Promise {<pending>}
```

Hai tính chất cốt lõi:

> [!WARNING]
> 1. **Settle một lần duy nhất, bất biến.** Sau khi đã `resolve`/`reject`, mọi lời gọi `resolve`/`reject` *sau đó đều bị bỏ qua*. Trạng thái và giá trị **không thể đổi**.
>    ```js
>    const p = new Promise((res, rej) => {
>      res(1);
>      res(2);   // bị bỏ qua
>      rej('E'); // bị bỏ qua
>    });
>    p.then(console.log); // 1
>    ```
> 2. **Không resolve/reject → pending mãi mãi.** Nếu executor không bao giờ gọi `resolve`/`reject`, Promise treo vô hạn (và các `.then` của nó không bao giờ chạy).

---

## Internal: Promise trông như thế nào bên trong

Theo spec, một Promise là object với các **internal slot** (không truy cập trực tiếp được):

| Internal slot | Ý nghĩa |
| --- | --- |
| `[[PromiseState]]` | `"pending"` / `"fulfilled"` / `"rejected"` |
| `[[PromiseResult]]` | value (khi fulfilled) hoặc reason (khi rejected) |
| `[[PromiseFulfillReactions]]` | danh sách callback `onFulfilled` đang chờ |
| `[[PromiseRejectReactions]]` | danh sách callback `onRejected` đang chờ |
| `[[PromiseIsHandled]]` | đã có handler chưa (để cảnh báo unhandledrejection) |

Cơ chế:
1. Khi `pending`, mỗi `.then(onF, onR)` **đăng ký** `onF`/`onR` vào danh sách reactions.
2. Khi `resolve(v)`: đặt state = `fulfilled`, result = `v`, rồi **lên lịch** mọi `onFulfilled` đang chờ vào **microtask queue**.
3. Nếu `.then` được gọi *sau khi* Promise đã settle, callback được lên lịch microtask *ngay* (không chạy đồng bộ).

```
 p.then(onF)
     │  state == pending?  → push onF vào [[PromiseFulfillReactions]]
     │  state == fulfilled? → lên lịch onF([[PromiseResult]]) vào microtask Q ngay
     ▼
 (khi resolve) → drain reactions → microtask queue → Event Loop chạy onF
```

---

## then / catch / finally

**`then(onFulfilled, onRejected)`** — đăng ký phản ứng. Tham số 2 (`onRejected`) thường ít dùng, ưu tiên `.catch`.

```js
p.then(
  (value) => console.log('ok', value),
  (reason) => console.error('lỗi', reason)
);
```

**Quy tắc vàng (từ ghi chú gốc): `then()` LUÔN trả về một Promise MỚI**, và Promise mới đó settle dựa trên *giá trị callback trả về*:

| Callback trong `.then` trả về | Promise mới sẽ... |
| --- | --- |
| một **value** thường (vd `5`) | **fulfilled** với `5` |
| **không return** / `undefined` | fulfilled với `undefined` |
| **throw** một exception | **rejected** với exception đó |
| một **fulfilled promise** | fulfilled với value của promise đó |
| một **rejected promise** | rejected với reason của promise đó |

Hệ quả tinh tế — **phải `return` thì chain mới nối đúng**:

```js
function createPM() {
  const p = Promise.resolve(3);
  p.then((v) => v - 2); // KHÔNG return → kết quả này bị "vứt đi"
  return p;             // trả về p gốc (vẫn là 3)
}
createPM().then((x) => console.log(x)); // 3

function createPM2() {
  const p = Promise.resolve(3);
  return p.then((v) => v - 2); // return chuỗi → 1
}
createPM2().then((x) => console.log(x)); // 1
```

**`catch(onRejected)`** — chỉ là `then(undefined, onRejected)`. Vì `catch` cũng trả Promise mới, **sau một `catch` chuỗi được "khôi phục"**:

```js
Promise.resolve('Success')
  .then((v) => { console.log(v); throw new Error('oh no'); })
  .catch((e) => console.error(e.message)) // bắt lỗi, không return → fulfilled(undefined)
  .then(() => console.log('chuỗi đã được khôi phục sau catch'));
// Success
// oh no
// chuỗi đã được khôi phục sau catch
```

**`finally(onFinally)`** — chạy dù fulfilled hay rejected; thường để cleanup/reset. Đặc biệt: `finally` **không nhận** value/reason và **"trong suốt"** — nó *chuyển tiếp* trạng thái phía trước, *trừ khi* callback của nó throw/reject:

```js
Promise.resolve(2).finally(() => {});               // fulfilled(2)  ← giữ nguyên 2
Promise.reject(3).finally(() => {});                // rejected(3)   ← giữ nguyên 3
Promise.reject(3).finally(() => Promise.reject(99)); // rejected(99) ← finally throw thì đè
```

---

## Chaining & flattening

`.then` trả Promise mới → ta nối liên tiếp thành **chuỗi phẳng**, đọc từ trên xuống:

```js
dangNhap(user)
  .then((token) => layHoSo(token))   // trả Promise → tự "flatten"
  .then((hoSo) => layDonHang(hoSo))  // chờ Promise trước resolve mới chạy
  .then((don) => console.log(don))
  .catch(xuLyLoi);                   // gom mọi lỗi của cả chuỗi
```

**Flattening (làm phẳng):** nếu callback `.then` trả về một *Promise*, chuỗi sẽ **chờ Promise đó** rồi mới truyền value (không lồng thành `Promise<Promise<...>>`). Đây là điều biến chuỗi async tuần tự thành code phẳng.

---

## then-callback là microtask

Callback của `.then/.catch/.finally` **không** chạy đồng bộ — chúng được đẩy vào **microtask queue** và chạy *sau* toàn bộ code đồng bộ, *trước* macrotask (như `setTimeout`).

```js
console.log('1');
setTimeout(() => console.log('2'), 0);   // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');
// Output: 1 4 3 2
```

`3` (microtask) chạy *trước* `2` (macrotask) dù cả hai "delay 0". Vì sao microtask ưu tiên hơn macrotask → xem [Event Loop — Deep Dive](/async/event-loop/).

---

## Deferred pattern

Vì "không resolve thì pending mãi", ta có thể **đưa quyền resolve/reject ra ngoài** executor để chủ động settle sau (deferred):

```js
const defer = {};
const promise = new Promise((resolve, reject) => {
  defer.resolve = resolve;
  defer.reject = reject;
});

console.log(promise);  // Promise {<pending>}
defer.resolve(5);      // → Promise {<fulfilled>: 5}
```

> [!NOTE]
> Pattern này thi thoảng hữu ích (vd cầu nối event → promise) nhưng thường bị xem là *anti-pattern* nếu lạm dụng. Từ ES2024 có `Promise.withResolvers()` làm chính xác việc này một cách chuẩn hoá.

---

## Combinator: all / allSettled / any / race

| Combinator | Resolve khi | Reject / lỗi khi | Giá trị resolve |
| --- | --- | --- | --- |
| `Promise.all` | **tất cả** fulfilled | **bất kỳ** một reject (fail-fast) | mảng các value |
| `Promise.allSettled` | **tất cả** đã settle | **không bao giờ** reject | mảng `{status, value/reason}` |
| `Promise.any` | **một** fulfilled đầu tiên | **tất cả** reject | value của cái fulfilled đầu tiên |
| `Promise.race` | cái **settle đầu tiên** (mọi trạng thái) | nếu cái đầu tiên reject | value/reason của cái nhanh nhất |

```js
// all — fail-fast nhưng các executor VẪN chạy
Promise.all([Promise.resolve(3), 42, delay(100, 'foo')])
  .then((vs) => console.log(vs)); // [3, 42, 'foo']

// allSettled — không bao giờ reject
Promise.allSettled([Promise.resolve(1), Promise.reject('E')])
  .then((r) => console.log(r));
// [{status:'fulfilled', value:1}, {status:'rejected', reason:'E'}]

// any — fulfilled đầu tiên; nếu tất cả reject → AggregateError
Promise.any([Promise.reject(0), delay(100, 'quick'), delay(500, 'slow')])
  .then((v) => console.log(v)); // 'quick'

// race — settle đầu tiên thắng (kể cả reject)
Promise.race([delay(100, 'a'), delay(50, 'b')]).then(console.log); // 'b'
```

> [!WARNING]
> **Điểm yếu của `Promise.all` (từ ghi chú gốc):** dù đã có một Promise reject và `all` reject ngay (fail-fast), các **executor còn lại vẫn tiếp tục chạy** đến cùng — không bị huỷ. Promise *không có cơ chế cancel* gốc. Muốn huỷ thật sự cần `AbortController`.

---

## Xử lý lỗi

- Lỗi trong executor (`throw`) → Promise tự động `reject`.
- `throw` trong bất kỳ `.then` nào → nhảy tới `.catch` gần nhất phía sau.
- Một `.catch` cuối chuỗi bắt được lỗi của *mọi* bước phía trước.

```js
Promise.reject(3)
  .catch((err) => { throw new Error(123); }) // catch 1: ném lỗi mới
  .catch((err) => console.log(err.message)); // catch 2: bắt → "123", chương trình KHÔNG dừng
```

> [!WARNING]
> Nếu *ném lỗi từ trong một callback async* (vd trong `setTimeout` bên trong `.catch`), lỗi đó **thoát khỏi** phạm vi Promise và có thể làm sập chương trình:
> ```js
> Promise.reject(3)
>   .catch((err) => setTimeout(() => { throw err; }, 1000)); // lỗi này KHÔNG được Promise bắt
> ```
> Một Promise rejected mà *không có* `.catch` nào → sự kiện `unhandledrejection` (browser) / cảnh báo (Node).

---

## Anti-patterns

| Anti-pattern | Vì sao tệ | Nên làm |
| --- | --- | --- |
| `then` lồng trong `then` | Tái tạo callback hell | `return` promise rồi `.then` tiếp ở cấp ngoài |
| Quên `return` trong `.then` | Chuỗi mất giá trị / lỗi không lan | Luôn `return` value/promise |
| `new Promise` bọc một promise có sẵn | Thừa (Promise constructor anti-pattern) | Dùng thẳng promise đó |
| Tạo Promise lồng nhau để chờ | Mất tính song song | Khởi tạo sớm + `Promise.all` |
| Không có `.catch` | Lỗi bị nuốt / unhandledrejection | Luôn kết chuỗi bằng `.catch` |

```js
// ❌ Nested then
asyncFunc1().then((v1) => {
  asyncFunc2().then((v2) => { /* ... */ }); // sai
});
// ✅ Flatten
asyncFunc1()
  .then((v1) => asyncFunc2())
  .then((v2) => { /* ... */ });
```

---

## Tự kiểm tra

> [!NOTE]
> **Câu hỏi:** Output theo thứ tự nào?
> ```js
> console.log('start');
> const p = new Promise((res) => { console.log('executor'); res(); });
> p.then(() => console.log('then'));
> setTimeout(() => console.log('timeout'), 0);
> console.log('end');
> ```

> [!TIP]
> **Đáp án:** `start` → `executor` → `end` → `then` → `timeout`.
> - `executor` chạy **đồng bộ** ngay khi `new Promise`.
> - `then` là **microtask** → sau code đồng bộ, trước `setTimeout`.
> - `timeout` là **macrotask** → cuối cùng.

---

## Cheat sheet

> [!IMPORTANT]
> 1. **Executor chạy đồng bộ ngay** khi `new Promise`; **then-callback chạy async** (microtask).
> 2. Ba trạng thái: `pending → fulfilled | rejected`. Settle **một lần, bất biến**.
> 3. `then()` **luôn trả Promise mới**; nhớ `return` để nối chuỗi. `catch` = `then(undefined, onRejected)`. `finally` trong suốt (giữ trạng thái cũ trừ khi nó throw).
> 4. then-callback là **microtask** → chạy trước `setTimeout`.
> 5. `all` fail-fast (executor còn lại vẫn chạy), `allSettled` không bao giờ reject, `any` lấy fulfilled đầu, `race` lấy settle đầu.
> 6. Luôn kết chuỗi bằng `.catch`; đừng lồng `then` trong `then`.

---

## Bài liên quan

- [Callbacks & Callback Hell](/async/callbacks/)
- [async / await](/async/async-await/)
- [Event Loop — Deep Dive](/async/event-loop/)
- [Hàm cơ bản](/function-closure/function-basics/)
