---
title: "Factory Functions"
description: "Factory function trong JavaScript: hàm trả về object (hoặc function), khác biệt factory function vs function factory vs constructor/class, dùng closure để tạo biến private và encapsulation, factory không cần new và không dính bẫy this, đánh đổi bộ nhớ so với prototype, khi nào chọn factory vs class. Kèm ví dụ chạy được, bảng so sánh và best practices."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Factory function vs function factory](#factory-function-vs-function-factory)
- [Factory tạo object với biến private](#factory-tạo-object-với-biến-private)
- [Factory vs constructor / class](#factory-vs-constructor--class)
- [Đánh đổi bộ nhớ](#đánh-đổi-bộ-nhớ)
- [Khi nào dùng factory](#khi-nào-dùng-factory)
- [Pitfalls](#pitfalls)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

**Factory function** là hàm **trả về một object** (hoặc đôi khi một function). Thay vì dùng `new` với constructor, bạn gọi hàm thường và nhận lại object đã dựng sẵn.

```js
function createUser(name, age) {
  return {
    name,
    age,
    greet() {
      return `Xin chào, tôi là ${name}`;
    },
  };
}

const u = createUser("Hiệp", 25);   // không cần new
u.greet();                           // "Xin chào, tôi là Hiệp"
```

Factory tận dụng [closure](/function-closure/closures/) để đóng gói trạng thái, và tránh hoàn toàn các bẫy của `this`/`new`.

---

## Factory function vs function factory

Hai khái niệm tên giống nhau nhưng **khác nhau**:

| | Trả về | Mục đích |
|---|--------|----------|
| **Factory function** | một **object** | thay thế constructor để tạo object |
| **Function factory** | một **function** | tạo hàm chuyên biệt (partial application) |

```js
// Factory function → trả về OBJECT
function createDog(name) {
  return { name, bark: () => "Gâu!" };
}

// Function factory → trả về FUNCTION
function multiplyWith(x) {
  return (y) => x * y;     // trả về hàm
}
const multiplyWith5 = multiplyWith(5);
multiplyWith5(4);          // 20
multiplyWith5(11);         // 55  — không phải lặp lại số 5
```

> [!NOTE]
> "Function factory" giải đúng bài toán trong ghi chú gốc: với `nhan(5, 4)`, `nhan(5, 10)`... phải lặp lại số 5. Dùng `nhanWith(5)` để cố định một lần rồi tái sử dụng. Đây chính là [partial application / currying](/function-closure/higher-order-functions/).

---

## Factory tạo object với biến private

Sức mạnh lớn nhất của factory: dùng closure tạo **biến thật sự private** — không truy cập được từ ngoài (khác với property gắn lên `this` vốn luôn public):

```js
function createCounter(start = 0) {
  let count = start;          // PRIVATE — nằm trong closure

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    get value() { return count; },
  };
}

const c = createCounter(10);
c.increment();   // 11
c.value;         // 11
c.count;         // undefined — KHÔNG truy cập trực tiếp được
```

```text
createCounter() ──▶ closure giữ [ count ]   (private)
                       ▲   ▲   ▲
              increment┘   │   └get value
                      decrement
   → chỉ các method được trả ra mới chạm tới count
```

---

## Factory vs constructor / class

Cùng tạo "đối tượng", nhưng cách dùng và hành vi `this` khác nhau:

```js
// Constructor function — cần new, dùng this
function UserC(name) {
  this.name = name;
  this.greet = function () { return `Hi ${this.name}`; };
}
const a = new UserC("An");      // quên new → this = global, bug!

// Class (cú pháp hiện đại cho constructor + prototype)
class UserK {
  constructor(name) { this.name = name; }
  greet() { return `Hi ${this.name}`; }
}
const b = new UserK("Bình");

// Factory — không new, không this, dùng closure
function createUser(name) {
  return { greet: () => `Hi ${name}` };
}
const c = createUser("Cường");   // gọi thường
```

| Tiêu chí | Factory function | Constructor / class |
|----------|------------------|---------------------|
| Cần `new`? | ❌ không | ✅ có (quên → bug) |
| Dùng `this`? | ❌ tránh được | ✅ phụ thuộc nhiều |
| Biến private | ✅ dễ (closure) | cần `#field` (ES2022) |
| Chia sẻ method qua prototype | ❌ (mỗi object một bản) | ✅ tiết kiệm bộ nhớ |
| `instanceof` | ❌ không tự nhiên | ✅ có |

---

## Đánh đổi bộ nhớ

Điểm yếu của factory: mỗi object tạo ra có **bản sao riêng** của mỗi method (giống vấn đề method-trong-constructor ở bài [Closures](/function-closure/closures/)). Với hàng nghìn instance, điều này tốn bộ nhớ.

```js
const c1 = createUser("A");
const c2 = createUser("B");
c1.greet === c2.greet;   // false — hai hàm greet KHÁC nhau
```

Class/prototype thì chia sẻ một bản method chung:

```js
const k1 = new UserK("A");
const k2 = new UserK("B");
k1.greet === k2.greet;   // true — cùng một hàm trên prototype
```

> [!TIP]
> Cần *nhiều* instance và quan tâm bộ nhớ → ưu tiên `class`/prototype. Cần *encapsulation mạnh*, ít instance, tránh hoàn toàn `this`/`new` → factory function gọn và an toàn hơn. Xem [Prototype & kế thừa](/objects-prototypes/prototype/).

---

## Khi nào dùng factory

- Cần biến private/encapsulation mà không muốn cú pháp `#field`.
- Muốn tránh bẫy `this` và lỗi quên `new`.
- Cần linh hoạt trả về *loại object khác nhau* tuỳ tham số.
- Kết hợp/compose nhiều behavior (mixin) thay vì kế thừa cứng.

```js
// Factory linh hoạt: trả object khác nhau theo điều kiện
function createShape(type, size) {
  const base = { size, describe() { return `${type} cỡ ${size}`; } };
  if (type === "circle") return { ...base, area: () => Math.PI * size ** 2 };
  if (type === "square") return { ...base, area: () => size ** 2 };
  return base;
}
createShape("circle", 2).area();   // ~12.57
```

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
|---------|--------|-----------|
| Tạo hàng loạt instance bằng factory | Tốn bộ nhớ (method nhân bản) | Dùng class/prototype |
| Nhầm factory function với function factory | Hiểu sai mục đích | Nhớ: object vs function |
| Mong `instanceof` hoạt động | Factory không gắn prototype chain | Dùng class nếu cần `instanceof` |
| Dùng `this` trong object trả về của arrow | `this` không trỏ object | Tham chiếu biến closure trực tiếp |

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** Vì sao `c.count` là `undefined` nhưng `c.value` lại là `11`?
> ```js
> function createCounter(start = 0) {
>   let count = start;
>   return { inc() { return ++count; }, get value() { return count; } };
> }
> const c = createCounter(10); c.inc();
> ```

> [!TIP]
> **Đáp án:** `count` là biến trong **closure**, không phải property của object trả ra → `c.count` truy cập property không tồn tại → `undefined`. Chỉ các method được trả ra mới chạm được `count` — đó là *biến private thật sự*.

> [!NOTE]
> **Câu 2:** `k1.greet === k2.greet` và `c1.greet === c2.greet` cho gì (class `UserK` vs factory `createUser`)?

> [!TIP]
> **Đáp án:** class → `true` (method nằm chung trên `prototype`); factory → `false` (mỗi object một **bản sao** method). Đó là đánh đổi bộ nhớ của factory.

---

## Cheat sheet

> [!IMPORTANT]
> 1. **Factory function** trả về **object** (thay constructor); **function factory** trả về **function** (partial application).
> 2. Factory dùng **closure** → biến private thật; không cần `new`, không dính bẫy `this`.
> 3. Đánh đổi: mỗi instance có **bản sao method riêng** → tốn bộ nhớ khi nhiều instance.
> 4. Nhiều instance + quan tâm bộ nhớ → **class/prototype**; cần encapsulation mạnh, ít instance → **factory**.
> 5. Factory **không** hỗ trợ `instanceof` tự nhiên (không gắn prototype chain).
> 6. Factory linh hoạt: trả loại object khác nhau tùy tham số; dễ compose (mixin) hơn kế thừa cứng.

---

## Bài liên quan

- [Closures](/function-closure/closures/)
- [Higher-order Functions](/function-closure/higher-order-functions/)
- [Từ khoá this](/function-closure/this-keyword/)
- [Prototype & kế thừa](/objects-prototypes/prototype/)
- [Class](/objects-prototypes/class/)
