---
title: "WeakMap & WeakSet"
description: "WeakMap & WeakSet đi sâu internal: weak reference vs strong reference, vì sao giữ key kiểu object yếu giúp garbage collector thu hồi & tránh memory leak, khác biệt với Map/Set (không duyệt được, không size, key chỉ là object), use case private data theo instance và cache theo object. Kèm sơ đồ GC, bảng so sánh, ví dụ chạy được, tự kiểm tra và cheat sheet."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Trực giác: strong vs weak reference](#trực-giác-strong-vs-weak-reference)
- [Internal: vì sao không gây memory leak](#internal-vì-sao-không-gây-memory-leak)
- [Map vs WeakMap](#map-vs-weakmap)
- [WeakSet](#weakset)
- [Use case: private data theo instance](#use-case-private-data-theo-instance)
- [Use case: cache theo object](#use-case-cache-theo-object)
- [Pitfalls](#pitfalls)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

**WeakMap** và **WeakSet** là phiên bản "giữ tham chiếu yếu" của `Map`/`Set`. Điểm cốt lõi: chúng giữ **key là object** theo kiểu *weak reference* — nghĩa là **không ngăn** garbage collector (GC) thu hồi object đó khi không còn ai khác dùng tới. Nhờ vậy tránh được rò rỉ bộ nhớ (memory leak).

```js
let user = { name: "Hiệp" };

const wm = new WeakMap();
wm.set(user, "metadata");   // user làm key
wm.get(user);               // "metadata"

user = null;   // không còn tham chiếu mạnh tới object
// → GC có thể thu hồi object đó, và entry trong WeakMap tự biến mất
```

---

## Trực giác: strong vs weak reference

Hình dung object như một quả bóng bay, và mỗi **tham chiếu** là một sợi dây giữ nó khỏi bay đi (bị GC thu hồi).

- **Strong reference** (Map/Set, biến thường): sợi dây *chắc*. Còn *một* sợi dây mạnh thì bóng không bay → object sống.
- **Weak reference** (WeakMap/WeakSet): sợi dây *hờ*. Nó **không tính** vào việc giữ bóng. Khi mọi sợi dây *mạnh* đã đứt, bóng bay đi *dù* sợi hờ còn đó — và sợi hờ tự tuột theo.

```text
            strong (Map)                 weak (WeakMap)
   biến ───────●  object        biến ─ ╳ (đã null)
   Map  ───────●  (sống mãi)    WeakMap ┄┄┄○  object
                  ⇒ leak nếu                  ⇒ GC thu hồi được,
                    quên xoá                    entry tự mất
```

---

## Internal: vì sao không gây memory leak

Vấn đề kinh điển với `Map`: nếu bạn dùng object làm key trong một `Map` sống lâu, thì **bản thân `Map` giữ một strong reference** tới object đó. Dù mọi nơi khác đã bỏ object, `Map` vẫn ghì nó lại → GC không thu hồi được → **memory leak**.

```js
const map = new Map();
let obj = { big: "dữ liệu lớn" };
map.set(obj, 1);
obj = null;        // tưởng là giải phóng...
// NHƯNG map vẫn giữ strong ref → object KHÔNG bị GC → leak
```

`WeakMap` giữ key **yếu**: nó không tính vào "còn ai dùng object không". Khi tham chiếu mạnh cuối cùng biến mất, GC thu hồi object, và entry tương ứng trong WeakMap **tự động bị xoá**.

```js
const wm = new WeakMap();
let obj = { big: "dữ liệu lớn" };
wm.set(obj, 1);
obj = null;        // tham chiếu mạnh cuối cùng đứt
// → GC thu hồi object; entry trong wm tự biến mất → KHÔNG leak
```

> [!IMPORTANT]
> Đây là *lý do tồn tại* của WeakMap/WeakSet: gắn dữ liệu phụ vào một object mà **không kéo dài vòng đời** của object đó. Khi object "chết", dữ liệu phụ cũng tự dọn.

---

## Map vs WeakMap

Cái giá của tham chiếu yếu: vì entry có thể *biến mất bất kỳ lúc nào* do GC, WeakMap **không cho phép** duyệt hay đếm — engine không thể đảm bảo một danh sách ổn định.

| | `Map` | `WeakMap` |
| --- | --- | --- |
| Kiểu key | Bất kỳ (object, primitive) | **Chỉ object** (và symbol không-đăng-ký) |
| Tham chiếu key | Mạnh (giữ object sống) | **Yếu** (cho phép GC) |
| Duyệt (`for...of`, `forEach`) | Có | **Không** |
| `size` | Có | **Không** |
| `keys()/values()/entries()` | Có | **Không** |
| Method | `get/set/has/delete` + duyệt | **Chỉ** `get/set/has/delete` |
| Dùng cho | Lưu trữ dữ liệu chung | Metadata gắn theo vòng đời object |

```js
const wm = new WeakMap();
wm.set("string", 1);   // ❌ TypeError — key phải là object
wm.set({}, 1);         // ok
```

---

## WeakSet

Tương tự nhưng là tập hợp (chỉ chứa object, không trùng lặp), giữ phần tử yếu:

```js
const visited = new WeakSet();
let node = { id: 1 };

visited.add(node);
visited.has(node);     // true
node = null;           // → GC thu hồi, node tự rời WeakSet
```

WeakSet cũng **không** duyệt được, không `size` — chỉ `add/has/delete`. Hợp để "đánh dấu" object (đã xử lý chưa, đã thăm chưa) mà không giữ chúng sống.

---

## Use case: private data theo instance

Gắn dữ liệu *riêng tư* cho từng instance mà không lộ ra trên chính object — dữ liệu tự dọn khi instance bị thu hồi:

```js
const _balance = new WeakMap();

class Account {
  constructor(initial) {
    _balance.set(this, initial);    // lưu riêng, không nằm trên this
  }
  deposit(x) {
    _balance.set(this, _balance.get(this) + x);
  }
  get balance() {
    return _balance.get(this);
  }
}

const acc = new Account(100);
acc.deposit(50);
acc.balance;             // 150
Object.keys(acc);        // []  — không thấy balance trên instance
```

> [!NOTE]
> Đây là kỹ thuật private *trước* khi có [`#private` field](/objects-prototypes/class/). Ngày nay `#field` gọn hơn, nhưng WeakMap-private vẫn hữu ích khi cần gắn dữ liệu vào object **không do bạn tạo** (vd DOM node của thư viện).

---

## Use case: cache theo object

Cache kết quả tính toán theo từng object; khi object hết dùng, cache tự giải phóng:

```js
const cache = new WeakMap();

function tinhNang(obj) {
  if (cache.has(obj)) return cache.get(obj);   // đã tính → trả luôn
  const result = obj.value * 1000;             // tính tốn kém
  cache.set(obj, result);
  return result;
}
```

Nếu dùng `Map`, các object đã cache sẽ *không bao giờ* được GC (cache giữ chúng sống mãi). `WeakMap` giải đúng bài này.

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
| --- | --- | --- |
| `wm.set("key", v)` | `TypeError` — key phải object | Dùng object/symbol làm key |
| Mong duyệt được WeakMap | Không có `keys/forEach/size` | Dùng `Map` nếu cần duyệt |
| Mong GC chạy ngay | GC không xác định thời điểm | Không phụ thuộc thời điểm thu hồi |
| Dùng WeakMap cho dữ liệu cần liệt kê | Mất khả năng duyệt | `Map` cho dữ liệu chung |
| Lưu object dùng làm key vào nơi khác (strong) | Object vẫn sống → không thu hồi | Bỏ mọi strong ref khi muốn dọn |

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** Vì sao đoạn dùng `Map` này gây memory leak còn `WeakMap` thì không?
> ```js
> const m = new Map();
> let obj = { big: "..." };
> m.set(obj, 1);
> obj = null;
> ```

> [!TIP]
> **Đáp án:** `Map` giữ **strong reference** tới `obj` qua key. Dù `obj = null`, `Map` vẫn ghì object lại → GC không thu hồi → leak. `WeakMap` giữ key **yếu** nên sau `obj = null`, GC thu hồi object và entry tự mất.

> [!NOTE]
> **Câu 2:** Đoạn này lỗi gì, vì sao?
> ```js
> const wm = new WeakMap();
> wm.set("userId", { name: "Hiệp" });
> ```

> [!TIP]
> **Đáp án:** `TypeError` — key của WeakMap **bắt buộc là object** (hoặc symbol chưa đăng ký), không được là string. Ở đây `"userId"` là string. (Value thì kiểu gì cũng được; chỉ *key* mới bị ràng buộc.)

---

## Cheat sheet

> [!IMPORTANT]
> 1. WeakMap/WeakSet giữ **key/phần tử là object** theo **weak reference** → không ngăn GC thu hồi.
> 2. Mục đích: gắn dữ liệu phụ vào object **mà không kéo dài vòng đời** object → tránh memory leak.
> 3. Key **phải là object** (không primitive); value tuỳ ý.
> 4. **Không** duyệt được, **không** `size`, chỉ `get/set/has/delete` (WeakSet: `add/has/delete`).
> 5. Dùng `Map`/`Set` khi cần liệt kê/đếm; dùng Weak khi cần dữ liệu tự dọn theo object.
> 6. Use case: **private data theo instance**, **cache theo object**, đánh dấu object đã xử lý.

---

## Bài liên quan

- [Object](/objects-prototypes/object/)
- [Closures](/function-closure/closures/)
- [Class](/objects-prototypes/class/)
- [Kiểu dữ liệu (stack/heap)](/fundamentals/data-types/)
