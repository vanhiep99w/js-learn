---
title: "this"
description: "4 binding rule của this (default/implicit/explicit/new), lexical this của arrow function và pitfalls."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [4 binding rules](#4-binding-rules)
- [Arrow function & lexical this](#arrow-function-lexical-this)
- [this trong callback / event](#this-trong-callback-event)
- [Pitfalls](#pitfalls)

---

Giá trị của `this` được xác định lúc gọi hàm (call-site), không phải lúc định nghĩa — trừ arrow function.

## Tổng quan

`this` phụ thuộc vào cách gọi hàm.

```js
// TODO: ví dụ minh hoạ
```

## 4 binding rules

Default, implicit, explicit, new binding.

```js
// TODO: ví dụ minh hoạ
```

## Arrow function & lexical this

Arrow không có `this` riêng.

```js
// TODO: ví dụ minh hoạ
```

## this trong callback / event

Vì sao `this` bị mất context.

```js
// TODO: ví dụ minh hoạ
```

## Pitfalls

Mất `this` khi truyền method làm callback.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="call, apply, bind" href="/functions/call-apply-bind/" />
  <Card title="Hàm cơ bản" href="/functions/function-basics/" />
</Cards>
