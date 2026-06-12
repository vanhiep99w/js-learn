---
title: "var, let, const"
description: "Phân biệt var / let / const: scope, hoisting, TDZ, re-declare & re-assign, const với object/array."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Function scope vs Block scope](#function-scope-vs-block-scope)
- [Hoisting & TDZ](#hoisting-tdz)
- [Re-declare & Re-assign](#re-declare-re-assign)
- [const với object/array](#const-với-objectarray)
- [Khi nào dùng gì](#khi-nào-dùng-gì)

---

`var`, `let`, `const` là 3 cách khai báo biến trong JavaScript. Hiểu rõ khác biệt giúp tránh bug về scope và hoisting.

## Tổng quan

So sánh nhanh 3 từ khoá.

```js
// TODO: ví dụ minh hoạ
```

## Function scope vs Block scope

`var` là function-scoped, `let`/`const` là block-scoped.

```js
// TODO: ví dụ minh hoạ
```

## Hoisting & TDZ

`var` hoisting và khởi tạo `undefined`; `let`/`const` nằm trong Temporal Dead Zone.

```js
// TODO: ví dụ minh hoạ
```

## Re-declare & Re-assign

Khả năng khai báo lại / gán lại của từng từ khoá.

```js
// TODO: ví dụ minh hoạ
```

## const với object/array

`const` chặn re-assign chứ không chặn mutate nội dung.

```js
// TODO: ví dụ minh hoạ
```

## Khi nào dùng gì

Quy tắc thực tế: ưu tiên `const`, dùng `let` khi cần gán lại, tránh `var`.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="Hoisting" href="/fundamentals/hoisting/" />
  <Card title="Scope & Scope Chain" href="/fundamentals/scope/" />
</Cards>
