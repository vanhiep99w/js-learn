---
title: "localStorage vs sessionStorage"
description: "Web Storage đi sâu: localStorage vs sessionStorage vs cookie (vòng đời, scope theo origin/tab, dung lượng, có gửi lên server không), Web Storage API (setItem/getItem/removeItem/clear/key), vì sao chỉ lưu string nên phải JSON.stringify/parse, sự kiện storage đồng bộ giữa tab, và pitfalls bảo mật (XSS, không lưu token nhạy cảm). Kèm bảng so sánh, ví dụ chạy được, tự kiểm tra và cheat sheet."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [So sánh: localStorage vs sessionStorage vs cookie](#so-sánh-localstorage-vs-sessionstorage-vs-cookie)
- [Web Storage API](#web-storage-api)
- [Chỉ lưu string — JSON.stringify/parse](#chỉ-lưu-string--jsonstringifyparse)
- [Scope theo origin](#scope-theo-origin)
- [Sự kiện storage — đồng bộ giữa tab](#sự-kiện-storage--đồng-bộ-giữa-tab)
- [Giới hạn](#giới-hạn)
- [Pitfalls & bảo mật](#pitfalls--bảo-mật)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

**Web Storage** (`localStorage` và `sessionStorage`) là kho lưu **key–value** phía client, ngay trong trình duyệt, không cần server. Cả hai có *cùng API*, chỉ khác **vòng đời** và **phạm vi**.

```js
localStorage.setItem("theme", "dark");
localStorage.getItem("theme");     // "dark"

sessionStorage.setItem("step", "2");
sessionStorage.getItem("step");    // "2"
```

- `localStorage`: **tồn tại vĩnh viễn** cho tới khi bị xoá (qua code hoặc người dùng) — còn sau khi đóng trình duyệt.
- `sessionStorage`: chỉ sống trong **một phiên tab** — đóng tab là mất.

---

## So sánh: localStorage vs sessionStorage vs cookie

| Tiêu chí | `localStorage` | `sessionStorage` | Cookie |
| --- | --- | --- | --- |
| Vòng đời | Vĩnh viễn (tới khi xoá) | Hết khi đóng tab | Theo `Expires`/`Max-Age` |
| Phạm vi | Theo origin, **chung mọi tab** | Theo origin, **riêng từng tab** | Theo domain/path |
| Dung lượng | ~5–10 MB | ~5 MB | **~4 KB** |
| Gửi lên server? | **Không** | **Không** | **Có** (mỗi request) |
| Truy cập từ JS | Có | Có | Có (trừ `HttpOnly`) |
| Kiểu lưu | String | String | String |

> [!NOTE]
> Cookie *tự động đính kèm* vào mọi HTTP request tới server (tốn băng thông) — phù hợp cho session token mà server cần đọc. Web Storage **không** gửi lên server, chỉ ở client — phù hợp cho trạng thái UI (theme, draft, bước form).

---

## Web Storage API

Cả `localStorage` và `sessionStorage` đều cùng bộ method:

```js
localStorage.setItem("user", "Hiệp");   // ghi (key, value đều string)
localStorage.getItem("user");           // "Hiệp" — đọc; không có → null
localStorage.removeItem("user");        // xoá một key
localStorage.clear();                   // xoá TẤT CẢ key của origin này

localStorage.length;                    // số lượng key
localStorage.key(0);                    // tên key thứ 0 (theo index)
```

> [!WARNING]
> `getItem` trả về **`null`** (không phải `undefined`) khi key không tồn tại. Kiểm tra `if (value === null)` hoặc `if (!value)` cho đúng.

Có thể truy cập kiểu property nhưng **không khuyến nghị** (dễ đụng tên method, không xử lý được key đặc biệt):

```js
localStorage.theme = "dark";   // hoạt động nhưng nên dùng setItem
```

---

## Chỉ lưu string — JSON.stringify/parse

Web Storage **chỉ lưu được string**. Lưu object/array/number, giá trị bị ép sang string một cách "ngây thơ" → mất dữ liệu:

```js
localStorage.setItem("user", { name: "Hiệp" });
localStorage.getItem("user");        // "[object Object]"  — hỏng!

localStorage.setItem("n", 42);
typeof localStorage.getItem("n");    // "string" — số thành "42"
```

Cách đúng: **serialize bằng JSON** khi ghi, **parse** khi đọc:

```js
const user = { name: "Hiệp", roles: ["admin"] };

localStorage.setItem("user", JSON.stringify(user));   // → '{"name":"Hiệp",...}'
const back = JSON.parse(localStorage.getItem("user")); // → object trở lại
back.name;   // "Hiệp"
```

> [!TIP]
> Bọc `JSON.parse` trong `try/catch`: nếu dữ liệu cũ/hỏng không phải JSON hợp lệ, `JSON.parse` sẽ ném lỗi. Và nhớ `JSON` **không** giữ được `Date`, `Map`, `Set`, `undefined`, function — chúng bị mất hoặc biến đổi khi serialize.

---

## Scope theo origin

Web Storage bị cô lập theo **origin** = `protocol + host + port`. Hai origin khác nhau **không** thấy storage của nhau:

```text
https://app.com         ┐
https://app.com:443     ┘ cùng origin → chung localStorage
http://app.com            ← KHÁC (protocol http vs https)
https://api.app.com       ← KHÁC (subdomain khác host)
https://app.com:8080      ← KHÁC (port khác)
```

`sessionStorage` còn hẹp hơn: cô lập theo **từng tab** — mở cùng URL ở hai tab thì mỗi tab có sessionStorage *riêng*.

---

## Sự kiện storage — đồng bộ giữa tab

Khi `localStorage` đổi ở **một tab**, các **tab khác** cùng origin nhận sự kiện `storage` — dùng để đồng bộ trạng thái (vd logout mọi tab):

```js
// Chạy ở các tab KHÁC (không phải tab vừa ghi)
window.addEventListener("storage", (e) => {
  e.key;        // key vừa đổi
  e.oldValue;   // giá trị cũ
  e.newValue;   // giá trị mới
  // vd: if (e.key === "token" && !e.newValue) logout();
});
```

> [!NOTE]
> Sự kiện `storage` **không** bắn ở chính tab vừa thực hiện thay đổi — chỉ ở các tab *khác*. `sessionStorage` (riêng tab) về cơ bản không kích hoạt cơ chế đồng bộ liên tab này.

---

## Giới hạn

- **Dung lượng ~5–10 MB** mỗi origin (tuỳ trình duyệt) — vượt sẽ ném `QuotaExceededError`.
- **Đồng bộ (synchronous):** đọc/ghi Web Storage *chặn* main thread. Ghi dữ liệu lớn/liên tục có thể gây giật. Worker **không** truy cập được Web Storage.
- **Chỉ string** → cần JSON serialize.
- Cần lưu **dữ liệu lớn/có cấu trúc/nhị phân** → dùng **IndexedDB** (bất đồng bộ, dung lượng lớn hơn nhiều).

---

## Pitfalls & bảo mật

| Pitfall | Vấn đề | Cách đúng |
| --- | --- | --- |
| Lưu object trực tiếp | Thành `"[object Object]"` | `JSON.stringify` / `JSON.parse` |
| `JSON.parse` dữ liệu hỏng | Ném lỗi | Bọc `try/catch`, có fallback |
| Quên `getItem` trả `null` | So sánh sai | Kiểm tra `=== null` |
| Lưu token/JWT nhạy cảm trong localStorage | **XSS đọc được** toàn bộ | Token nhạy cảm → cookie `HttpOnly` + `Secure` |
| Tin tưởng dữ liệu từ storage | Người dùng/script sửa được | Luôn validate khi đọc |

> [!WARNING]
> **Bảo mật:** mọi script chạy trên trang (kể cả script bị chèn qua **XSS**) đều đọc được `localStorage`. **Đừng** lưu mật khẩu, JWT nhạy cảm, hay dữ liệu bí mật ở đây. Token xác thực nên đặt trong cookie `HttpOnly` (JS không đọc được) + `Secure` + `SameSite`.

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** Output?
> ```js
> localStorage.setItem("data", { x: 1 });
> console.log(localStorage.getItem("data"));
> console.log(typeof localStorage.getItem("data"));
> ```

> [!TIP]
> **Đáp án:** `"[object Object]"` và `"string"`. Web Storage chỉ lưu string nên object bị ép `String({x:1})` → `"[object Object]"` (mất dữ liệu). Phải `JSON.stringify` trước khi `setItem` và `JSON.parse` sau khi `getItem`.

> [!NOTE]
> **Câu 2:** Mở `https://app.com` ở 2 tab. Tab A ghi `sessionStorage.setItem("k","1")`. Tab B đọc `sessionStorage.getItem("k")` ra gì? Nếu đổi thành `localStorage` thì sao?

> [!TIP]
> **Đáp án:** Với `sessionStorage`: tab B ra `null` — sessionStorage **riêng từng tab**, không chia sẻ. Với `localStorage`: tab B ra `"1"` — localStorage **chung mọi tab** cùng origin (và tab B còn nhận được sự kiện `storage`).

---

## Cheat sheet

> [!IMPORTANT]
> 1. `localStorage` (vĩnh viễn, chung mọi tab) vs `sessionStorage` (hết khi đóng tab, riêng tab) — **cùng API**.
> 2. Cookie ~4KB và **tự gửi lên server** mỗi request; Web Storage ~5MB và **chỉ ở client**.
> 3. API: `setItem/getItem/removeItem/clear/key/length`. `getItem` thiếu key → **`null`**.
> 4. Chỉ lưu **string** → luôn `JSON.stringify` khi ghi, `JSON.parse` (trong `try/catch`) khi đọc.
> 5. Cô lập theo **origin** (protocol+host+port); sửa `localStorage` bắn sự kiện `storage` ở các tab khác.
> 6. **Bảo mật:** XSS đọc được localStorage → **không** lưu token nhạy cảm; dùng cookie `HttpOnly`. Dữ liệu lớn/có cấu trúc → IndexedDB.

---

## Bài liên quan

- [Web Workers](/advanced/web-workers/)
- [Object](/objects-prototypes/object/)
- [Kiểu dữ liệu](/fundamentals/data-types/)
- [Event-Driven & EventEmitter](/advanced/event-driven/)
