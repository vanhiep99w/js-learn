---
title: "Closures"
description: "Closure & lexical environment: cơ chế ghi nhớ biến, use case (data privacy, currying, memoize) và pitfalls."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Lexical Environment](#lexical-environment)
- [Cơ chế ghi nhớ biến](#cơ-chế-ghi-nhớ-biến)
- [Use cases](#use-cases)
- [Pitfalls](#pitfalls)

---

Closure là khả năng một hàm 'nhớ' và truy cập lexical scope của nó kể cả khi hàm được thực thi ngoài scope đó.

## Tổng quan

Closure là gì.

```js
// TODO: ví dụ minh hoạ
```

## Lexical Environment

Hàm capture biến từ scope cha.

```js
// TODO: ví dụ minh hoạ
```

## Cơ chế ghi nhớ biến

Vì sao biến không bị GC.

```js
// TODO: ví dụ minh hoạ
```

## Use cases

Data privacy, currying, memoization, module pattern.

```js
// TODO: ví dụ minh hoạ
```

## Pitfalls

Closure trong vòng lặp với `var`.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="Scope & Scope Chain" href="/fundamentals/scope/" />
  <Card title="Factory Functions" href="/functions/factory-functions/" />
</Cards>
