---
title: "Web Workers"
description: "Web Workers đi sâu: vì sao JS single-thread cần worker để chạy tính toán nặng trên thread nền không block UI, main thread vs worker, giao tiếp qua postMessage & onmessage (message passing), structured clone vs Transferable (ArrayBuffer) vs SharedArrayBuffer, các loại worker (dedicated/shared/service), và limitations (không DOM, overhead serialize). Kèm sơ đồ, ví dụ chạy được, tự kiểm tra và cheat sheet."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Vì sao cần worker — bài toán block UI](#vì-sao-cần-worker--bài-toán-block-ui)
- [Main thread vs Worker](#main-thread-vs-worker)
- [postMessage & onmessage](#postmessage--onmessage)
- [Internal: dữ liệu được copy thế nào](#internal-dữ-liệu-được-copy-thế-nào)
- [Các loại worker](#các-loại-worker)
- [Use cases](#use-cases)
- [Limitations](#limitations)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

JavaScript trong trình duyệt chạy **một thread duy nhất** (main thread) — cũng là thread vẽ giao diện. Một vòng lặp tính toán nặng sẽ *chiếm* thread này, khiến UI **đơ** (không cuộn, không bấm được). **Web Worker** cho phép chạy JS trên một **thread nền** riêng, tách khỏi main thread, để việc nặng không làm treo giao diện.

```js
// main.js
const worker = new Worker("worker.js");
worker.postMessage({ n: 40 });           // gửi việc cho worker
worker.onmessage = (e) => {
  console.log("Kết quả:", e.data);        // nhận kết quả về
};

// worker.js (chạy trên thread khác)
onmessage = (e) => {
  const result = fib(e.data.n);          // tính nặng, KHÔNG block main
  postMessage(result);
};
```

---

## Vì sao cần worker — bài toán block UI

Nhớ lại [Event Loop](/async/event-loop/): JS single-thread, mọi thứ xếp hàng trên *một* call stack. Một hàm chạy lâu sẽ giữ stack, khiến event loop không xử lý được render hay click:

```js
// Trên main thread — UI ĐƠ trong suốt thời gian này
function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
fib(45);   // chạy vài giây → trình duyệt "Not Responding"
```

> [!IMPORTANT]
> `setTimeout`/Promise **không** giải quyết được việc *tính toán nặng* — chúng chỉ *dời* thời điểm chạy, nhưng khi chạy vẫn trên main thread và vẫn block. Muốn *thật sự song song* (parallel) cần một thread khác → Web Worker.

```text
Không worker:                    Có worker:
main: [────fib(45)────] UI đơ    main:   [post]···········[nhận] UI mượt
                                 worker:      [──fib(45)──]
                                              (thread riêng, song song)
```

---

## Main thread vs Worker

| | Main thread | Worker thread |
| --- | --- | --- |
| Truy cập DOM / `window` | Có | **Không** |
| Vẽ UI | Có | Không |
| `self` / global | `window` | `WorkerGlobalScope` |
| Dùng được | `fetch`, `setTimeout`, `WebSocket`, IndexedDB... | Hầu hết (trừ DOM) |
| Bộ nhớ | Chung của tab | **Riêng** — không chia sẻ biến |
| Giao tiếp | `worker.postMessage` | `self.postMessage` |

Điểm mấu chốt: hai thread **không chia sẻ biến** trực tiếp. Mỗi worker có vùng nhớ riêng; trao đổi dữ liệu *chỉ* qua **message passing** (gửi tin nhắn), không phải biến chung.

---

## postMessage & onmessage

Giao tiếp hai chiều bằng cặp `postMessage` (gửi) và `onmessage` (nhận):

```js
// ----- main.js -----
const worker = new Worker("worker.js");

worker.postMessage({ type: "sum", payload: [1, 2, 3, 4] });

worker.onmessage = (e) => {
  console.log("nhận từ worker:", e.data);   // { type: "result", value: 10 }
};

worker.onerror = (e) => console.error("worker lỗi:", e.message);

// worker.terminate();   // chủ động dừng worker từ main

// ----- worker.js -----
self.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === "sum") {
    const value = payload.reduce((a, b) => a + b, 0);
    self.postMessage({ type: "result", value });
  }
};
```

> [!NOTE]
> `e.data` chứa *bản sao* dữ liệu đã gửi, đọc trong `e.data` của handler. Vì là message-based và bất đồng bộ, bạn thường tự thêm trường `type` để phân loại tin nhắn (như ví dụ trên).

---

## Internal: dữ liệu được copy thế nào

Vì hai thread không chia sẻ bộ nhớ, dữ liệu gửi qua `postMessage` được xử lý theo một trong ba cách:

**1) Structured clone (mặc định):** dữ liệu được **deep-copy** bằng *structured clone algorithm* — sao chép sâu, xử lý được object lồng, `Date`, `Map`, `Set`, `ArrayBuffer`... (nhưng **không** copy được function, DOM node, hay symbol).

```js
worker.postMessage({ user: { name: "Hiệp" } });   // object được clone sâu
```

**2) Transferable objects — *chuyển quyền sở hữu*, không copy:** với dữ liệu lớn (`ArrayBuffer`), bạn có thể *chuyển* (transfer) thay vì copy — gần như tức thì, nhưng bên gửi **mất quyền truy cập**:

```js
const buf = new ArrayBuffer(8 * 1024 * 1024);   // 8MB
worker.postMessage(buf, [buf]);                  // tham số 2: danh sách transfer
buf.byteLength;                                  // 0 — đã "trao tay", main không dùng được nữa
```

**3) SharedArrayBuffer — *thật sự chia sẻ* bộ nhớ** giữa các thread (không copy, không chuyển), dùng cùng `Atomics` để đồng bộ — mạnh nhưng phức tạp và cần HTTP header bảo mật (COOP/COEP).

> [!WARNING]
> Structured clone của object lớn **tốn chi phí** (serialize/deserialize) — đây là overhead chính của worker. Với buffer lớn, ưu tiên **Transferable** để tránh copy. Đừng "nhồi" object khổng lồ qua lại liên tục.

---

## Các loại worker

| Loại | Đặc điểm | Dùng cho |
| --- | --- | --- |
| **Dedicated Worker** | Gắn với *một* trang tạo ra nó | Tính toán nặng cho riêng trang đó |
| **Shared Worker** | Chia sẻ giữa nhiều tab/iframe cùng origin | Trạng thái/kết nối dùng chung giữa các tab |
| **Service Worker** | Proxy mạng, chạy nền cả khi không có trang | Cache offline, PWA, push notification |

Phổ biến nhất là **Dedicated Worker** (`new Worker(...)`). Service Worker là một chủ đề riêng lớn (offline-first, [storage](/advanced/storage/)).

---

## Use cases

- **Tính toán nặng:** xử lý ảnh/video, mã hoá, nén, parse dữ liệu lớn, tính toán khoa học.
- **Xử lý dữ liệu lớn:** parse/transform JSON/CSV hàng MB mà không đơ UI.
- **Polling/đồng bộ nền:** giữ kết nối, xử lý message stream.
- **Service Worker:** cache, hoạt động offline (PWA).

---

## Limitations

| Hạn chế | Chi tiết |
| --- | --- |
| **Không DOM** | Worker không truy cập `document`/`window` → không sửa UI trực tiếp; phải gửi kết quả về main để main cập nhật DOM |
| **Overhead serialize** | Structured clone object lớn tốn CPU; cân nhắc Transferable |
| **Không chia sẻ biến** | Mỗi thread bộ nhớ riêng; chỉ trao đổi qua message (trừ SharedArrayBuffer) |
| **Chi phí khởi tạo** | Tạo worker tốn tài nguyên; với việc nhỏ, overhead > lợi ích |
| **File riêng / module** | Cổ điển cần file `.js` riêng (hoặc Blob URL / `type: "module"`) |

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** Tại sao bọc hàm tính nặng trong `setTimeout(fn, 0)` *không* giúp UI hết đơ, còn Web Worker thì có?

> [!TIP]
> **Đáp án:** `setTimeout` chỉ *dời* thời điểm chạy `fn` sang một lượt event loop sau, nhưng khi `fn` chạy nó **vẫn trên main thread** và vẫn chiếm call stack → UI vẫn đơ. Web Worker chạy `fn` trên **thread khác**, song song thật sự, nên main thread rảnh để vẽ UI.

> [!NOTE]
> **Câu 2:** Sau đoạn này, `buf.byteLength` bằng bao nhiêu? Vì sao?
> ```js
> const buf = new ArrayBuffer(1024);
> worker.postMessage(buf, [buf]);
> ```

> [!TIP]
> **Đáp án:** `0`. Truyền `buf` trong danh sách transfer (`[buf]`) là **chuyển quyền sở hữu** (Transferable), không copy — sau khi chuyển, main thread mất quyền truy cập nên buffer rỗng (`byteLength = 0`). Nếu không dùng transfer list, buffer sẽ bị *copy* (structured clone) và `byteLength` vẫn là `1024`.

---

## Cheat sheet

> [!IMPORTANT]
> 1. JS single-thread → tính toán nặng block UI. **Worker** chạy JS trên **thread nền** riêng, song song thật.
> 2. `setTimeout`/Promise **không** cứu được việc nặng (vẫn trên main thread); chỉ worker mới parallel.
> 3. Hai thread **không chia sẻ biến** — giao tiếp qua `postMessage` / `onmessage` (message passing).
> 4. Dữ liệu mặc định **deep-copy** (structured clone); buffer lớn dùng **Transferable** (`postMessage(buf, [buf])`) để khỏi copy.
> 5. Worker **không truy cập DOM/window** → gửi kết quả về main để cập nhật UI.
> 6. Loại: Dedicated (thường dùng), Shared (nhiều tab), Service Worker (cache/offline).

---

## Bài liên quan

- [Event Loop — Deep Dive](/async/event-loop/)
- [localStorage vs sessionStorage](/advanced/storage/)
- [Callbacks](/async/callbacks/)
- [async / await](/async/async-await/)
