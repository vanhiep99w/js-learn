---
title: "Callbacks & Callback Hell"
description: "Hiểu callback từ trực giác đến internal: hàm là first-class value, sync callback chạy ngay trên Call Stack vs async callback đi qua Web API → queue → Event Loop, error-first callback của Node, callback hell (pyramid of doom), inversion of control, và vì sao Promise ra đời. Kèm trace table, sơ đồ và anti-patterns."
---

> [!NOTE]
> Đây là bài nền tảng của nhánh **Bất đồng bộ**. Nếu chưa rõ vì sao JS "single-thread mà không block", hãy đọc [Event Loop — Deep Dive](/async/event-loop/) trước; bài này tập trung vào *callback* — viên gạch async đầu tiên trước khi có Promise.

## Mục lục

- [Trực giác: gọi món rồi được gọi lại](#trực-giác-gọi-món-rồi-được-gọi-lại)
- [Callback là gì — và vì sao JS làm được](#callback-là-gì-và-vì-sao-js-làm-được)
- [Sync callback vs Async callback](#sync-callback-vs-async-callback)
- [Internal: async callback đi đường nào?](#internal-async-callback-đi-đường-nào)
- [Error-first callback (quy ước Node)](#error-first-callback-quy-ước-node)
- [Callback Hell — kim tự tháp của sự tuyệt vọng](#callback-hell-kim-tự-tháp-của-sự-tuyệt-vọng)
- [Inversion of Control — vấn đề sâu hơn cú pháp](#inversion-of-control-vấn-đề-sâu-hơn-cú-pháp)
- [Đường tới Promise](#đường-tới-promise)
- [Anti-patterns](#anti-patterns)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Trực giác: gọi món rồi được gọi lại

Bạn vào quán, gọi một món cần nấu lâu. Bạn **không** đứng chôn chân ở quầy chờ (block). Thay vào đó bạn **để lại số bàn** và nói: "nấu xong thì mang ra bàn 5". Cái "việc cần làm khi xong" mà bạn để lại chính là **callback**.

Điểm mấu chốt: bạn *đưa trước* cho bếp một hành động, và **bếp** mới là người quyết định *khi nào* gọi lại hành động đó. Bạn giao quyền chủ động cho người khác — ý tưởng này về sau sẽ là nguồn gốc của cả sự tiện lợi lẫn rắc rối ([Inversion of Control](#inversion-of-control-vấn-đề-sâu-hơn-cú-pháp)).

---

## Callback là gì — và vì sao JS làm được

**Callback** là một hàm được **truyền vào** một hàm khác dưới dạng tham số, để hàm đó **gọi lại** ("call back") tại một thời điểm nào đó.

```js
function chao(ten) {
  console.log(`Xin chào, ${ten}`);
}

function xuLy(ten, callback) {
  callback(ten); // gọi lại hàm được truyền vào
}

xuLy('An', chao); // Xin chào, An
```

Điều này khả thi vì trong JavaScript **hàm là first-class citizen**: hàm là một *giá trị* — có thể gán cho biến, truyền làm tham số, trả về từ hàm khác. Xem lại [Hàm cơ bản](/function-closure/function-basics/) và [Higher-order Functions](/function-closure/higher-order-functions/).

> [!IMPORTANT]
> Truyền `chao` (không có `()`) là truyền **chính hàm**. Truyền `chao()` là truyền **kết quả** của việc gọi hàm. Nhầm hai cái này là lỗi callback kinh điển:
> ```js
> setTimeout(chao('An'), 1000); // SAI: chao chạy NGAY, setTimeout nhận undefined
> setTimeout(() => chao('An'), 1000); // ĐÚNG: bọc trong hàm, chạy sau 1s
> ```

---

## Sync callback vs Async callback

Cùng là callback, nhưng có **hai loại hoàn toàn khác nhau về thời điểm chạy**.

**Sync callback (đồng bộ):** được gọi *ngay lập tức*, *bên trong* lời gọi hàm cha, *trước khi* hàm cha return. Ví dụ: callback của `map`, `filter`, `forEach`, `sort`.

```js
console.log('A');
[1, 2, 3].forEach((n) => console.log(n)); // 1 2 3 — chạy NGAY, tuần tự
console.log('B');
// Output: A 1 2 3 B
```

**Async callback (bất đồng bộ):** được *đăng ký* bây giờ nhưng *gọi sau*, khi một sự kiện/tác vụ hoàn tất. Ví dụ: callback của `setTimeout`, `addEventListener`, đọc file, gọi mạng.

```js
console.log('A');
setTimeout(() => console.log('timer'), 0); // đăng ký, chạy SAU
console.log('B');
// Output: A B timer  ← "timer" chạy cuối, dù delay = 0
```

| Tiêu chí | Sync callback | Async callback |
| --- | --- | --- |
| Thời điểm chạy | Ngay trong lời gọi cha | Sau, khi tác vụ xong |
| Chạy trên | Call Stack hiện tại | Một lượt event loop sau |
| Ví dụ | `map`, `filter`, `sort` | `setTimeout`, sự kiện, I/O |
| Có block không? | Có (chạy xong mới đi tiếp) | Không (đăng ký rồi đi tiếp) |

> [!WARNING]
> Đừng giả định một API gọi callback đồng bộ hay bất đồng bộ. Một hàm gọi callback **lúc đồng bộ, lúc bất đồng bộ** (gọi là *"releasing Zalgo"*) rất khó debug. Nguyên tắc: nếu là tác vụ async, hãy **luôn** gọi callback bất đồng bộ.

---

## Internal: async callback đi đường nào?

Vì sao `setTimeout(..., 0)` lại chạy *sau* `console.log('B')`? Vì callback async **không** chạy trên Call Stack hiện tại. Nó đi một vòng:

```
   xuLy()              setTimeout(cb, 0)
     │                       │
     ▼                       ▼
┌──────────┐         ┌──────────────┐
│Call Stack│         │  Web API     │  (Timer do trình duyệt/Node quản lý)
└──────────┘         │  đếm 0ms...  │
     │               └──────┬───────┘
     │ (rỗng, code           │ hết giờ → đẩy cb vào hàng đợi
     │  đồng bộ xong)        ▼
     │               ┌──────────────┐
     └──── lấy cb ◄──│ Macrotask Q  │
        khi stack    └──────────────┘
        rỗng (Event Loop)
```

1. `setTimeout(cb, 0)` chỉ **đăng ký** `cb` với Web API Timer rồi return ngay.
2. Code đồng bộ phía dưới chạy tiếp tới khi Call Stack **rỗng**.
3. Khi timer hết giờ, `cb` được đưa vào **Macrotask Queue**.
4. **Event Loop** thấy stack rỗng → lấy `cb` ra chạy.

Đây chính là lý do callback async luôn "xếp hàng sau" code đồng bộ. Cơ chế đầy đủ (macrotask vs microtask, thứ tự ưu tiên) nằm ở [Event Loop — Deep Dive](/async/event-loop/).

> [!NOTE]
> JS chỉ có **single thread**: tại một thời điểm chỉ chạy một task. Các ngôn ngữ như Java có thể đẩy việc sang thread khác để chạy "song song"; JS thì offload tác vụ chờ (timer, mạng, I/O) sang **host** (Web APIs / libuv) rồi nhận lại kết quả qua callback. Nhờ vậy single-thread vẫn không bị block.

---

## Error-first callback (quy ước Node)

Khi callback chạy *sau*, ta không thể dùng `try/catch` quanh lời gọi để bắt lỗi (lúc lỗi xảy ra, `try` đã thoát từ lâu). Node giải bài này bằng quy ước **error-first**: tham số *đầu tiên* của callback luôn là `error`.

```js
const fs = require('fs');

fs.readFile('config.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Đọc file lỗi:', err.message);
    return; // QUAN TRỌNG: return để không chạy tiếp với data = undefined
  }
  console.log('Nội dung:', data);
});
```

Quy ước:
- `callback(err, data)` — `err` là `null`/`undefined` nếu thành công.
- Luôn kiểm tra `if (err)` **trước**, và `return` sau khi xử lý lỗi.

> [!WARNING]
> `try/catch` **không** bắt được lỗi ném ra từ trong callback async:
> ```js
> try {
>   setTimeout(() => { throw new Error('bùm'); }, 0);
> } catch (e) {
>   // KHÔNG bao giờ chạy — lỗi ném ra ở một lượt event loop khác
> }
> ```

---

## Callback Hell — kim tự tháp của sự tuyệt vọng

Khi nhiều tác vụ async **phụ thuộc tuần tự** (cái sau cần kết quả cái trước), callback bị **lồng vào nhau**, tạo ra "pyramid of doom" — code thụt lề sâu dần sang phải, rất khó đọc và bảo trì.

```js
dangNhap(user, (err, token) => {
  if (err) return xuLyLoi(err);
  layHoSo(token, (err, hoSo) => {
    if (err) return xuLyLoi(err);
    layDonHang(hoSo.id, (err, donHang) => {
      if (err) return xuLyLoi(err);
      layChiTiet(donHang[0], (err, chiTiet) => {
        if (err) return xuLyLoi(err);
        console.log(chiTiet); // ← thụt lề 5 tầng chỉ để tới đây
      });
    });
  });
});
```

Vấn đề:
- **Khó đọc**: luồng logic chạy theo chiều "kim tự tháp" thay vì từ trên xuống.
- **Lặp xử lý lỗi**: `if (err) return ...` rải khắp mọi tầng.
- **Khó tái sử dụng / khó test**: logic dính chặt vào nhau.

Giảm nhẹ phần nào bằng cách **tách hàm có tên** (không giải quyết gốc rễ):

```js
function buoc1(err, token) {
  if (err) return xuLyLoi(err);
  layHoSo(token, buoc2);
}
function buoc2(err, hoSo) { /* ... gọi buoc3 ... */ }

dangNhap(user, buoc1);
```

---

## Inversion of Control — vấn đề sâu hơn cú pháp

Callback hell chỉ là vấn đề *hình thức*. Vấn đề *bản chất* là **Inversion of Control** (đảo ngược quyền kiểm soát): khi bạn đưa callback cho một hàm (nhất là hàm của bên thứ ba), **bạn trao cho nó quyền** quyết định khi nào, bao nhiêu lần, và như thế nào callback của bạn được gọi.

```js
thanhToan(donHang, function (err) {
  // Bạn TIN rằng hàm thanhToan sẽ:
  // - gọi callback đúng MỘT lần           → lỡ nó gọi 2 lần thì sao?
  // - không gọi quá sớm / quá muộn         → lỡ không bao giờ gọi thì sao?
  // - truyền đúng tham số                  → lỡ nuốt mất lỗi thì sao?
  guiEmailXacNhan(); // có thể bị gọi 2 lần → tính tiền 2 lần!
});
```

Bạn không kiểm soát được những điều này — chúng nằm trong tay hàm kia. Đây mới là lý do sâu xa khiến cộng đồng cần một mô hình tốt hơn.

> [!IMPORTANT]
> **Promise** ra đời để *giành lại quyền kiểm soát*: thay vì *đưa* callback cho người khác gọi, bạn *nhận về* một đối tượng (Promise) và **tự** gắn hành động vào nó. Promise đảm bảo: chỉ settle **một lần**, không thể đổi trạng thái sau khi đã settle, và luôn gọi callback **bất đồng bộ**.

---

## Đường tới Promise

So sánh cùng một chuỗi tác vụ:

```js
// Callback: lồng nhau, đảo ngược control
dangNhap(user, (err, token) => {
  if (err) return xuLyLoi(err);
  layHoSo(token, (err, hoSo) => {
    if (err) return xuLyLoi(err);
    console.log(hoSo);
  });
});

// Promise: phẳng, đọc từ trên xuống, gom lỗi một chỗ
dangNhap(user)
  .then((token) => layHoSo(token))
  .then((hoSo) => console.log(hoSo))
  .catch(xuLyLoi); // MỘT chỗ bắt lỗi cho cả chuỗi
```

Promise biến "kim tự tháp" thành một **chuỗi phẳng**, gom xử lý lỗi về một `.catch`. Chi tiết ở bài [Promises](/async/promises/).

---

## Anti-patterns

| Anti-pattern | Vì sao tệ | Nên làm |
| --- | --- | --- |
| `setTimeout(fn(), 0)` | `fn` chạy ngay, không phải sau | `setTimeout(() => fn(), 0)` |
| Quên `return` sau khi xử lý lỗi | Code chạy tiếp với data lỗi/undefined | `if (err) { handle(); return; }` |
| `try/catch` quanh callback async | Không bắt được lỗi async | Dùng error-first `(err, data)` |
| Lồng callback sâu | Pyramid of doom | Promise / async-await |
| Gọi callback lúc sync lúc async | "Zalgo" — thứ tự khó đoán | Luôn gọi async cho tác vụ async |

---

## Tự kiểm tra

> [!NOTE]
> **Câu hỏi:** Output của đoạn này là gì?
> ```js
> console.log('1');
> setTimeout(() => console.log('2'), 0);
> [10, 20].forEach((n) => console.log(n));
> console.log('3');
> ```

> [!TIP]
> **Đáp án:** `1 10 20 3 2`.
> - `console.log('1')` — đồng bộ.
> - `setTimeout(..., 0)` — đăng ký callback **async**, xếp vào macrotask queue.
> - `forEach` — callback **sync**, chạy ngay: `10 20`.
> - `console.log('3')` — đồng bộ.
> - Stack rỗng → event loop lấy callback timer ra: `2`.

---

## Cheat sheet

> [!IMPORTANT]
> 1. Callback = hàm truyền vào hàm khác để **gọi lại sau** (nhờ hàm là first-class value).
> 2. **Sync callback** chạy ngay trên Call Stack (`map`/`forEach`); **async callback** chạy sau qua Web API → queue → event loop (`setTimeout`/I/O).
> 3. Truyền `fn`, **đừng** truyền `fn()` — trừ khi bạn cố ý dùng kết quả.
> 4. Lỗi async dùng **error-first** `(err, data)`, không dùng `try/catch`. Luôn `return` sau khi xử lý lỗi.
> 5. Lồng callback sâu = **callback hell**; vấn đề gốc là **inversion of control**.
> 6. **Promise** giành lại quyền kiểm soát + làm phẳng chuỗi → bước tiến tiếp theo.

---

## Bài liên quan

- [Event Loop — Deep Dive](/async/event-loop/)
- [Promises](/async/promises/)
- [async / await](/async/async-await/)
- [Hàm cơ bản](/function-closure/function-basics/)
- [Higher-order Functions](/function-closure/higher-order-functions/)
