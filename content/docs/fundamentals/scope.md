---
title: "Scope & Scope Chain"
description: "Global / function / block scope, lexical scope và cơ chế scope chain khi resolve biến."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Global / Function / Block scope](#global-function-block-scope)
- [Lexical scope](#lexical-scope)
- [Scope chain & resolution](#scope-chain-resolution)
- [Pitfalls](#pitfalls)

---

Scope quyết định vùng mà một biến có thể được truy cập. JS dùng lexical (static) scope.

## Tổng quan

Khái niệm scope.

```js
// TODO: ví dụ minh hoạ
```

## Global / Function / Block scope

3 loại scope chính.

```js
// TODO: ví dụ minh hoạ
```

## Lexical scope

Scope được xác định tại thời điểm viết code, không phải lúc gọi.

```js
// TODO: ví dụ minh hoạ
```

## Scope chain & resolution

Cách engine tra cứu biến qua chuỗi scope.

```js
// TODO: ví dụ minh hoạ
```

## Pitfalls

Biến leak ra global, shadowing, v.v.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="Closures" href="/functions/closures/" />
  <Card title="Hoisting" href="/fundamentals/hoisting/" />
</Cards>
