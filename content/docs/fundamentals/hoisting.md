---
title: "Hoisting"
description: "Cơ chế hoisting trong JS: creation phase, hoisting của var/let/const/function, TDZ và các pitfall."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Creation Phase vs Execution Phase](#creation-phase-vs-execution-phase)
- [Hoisting với var](#hoisting-với-var)
- [Hoisting với let/const (TDZ)](#hoisting-với-letconst-tdz)
- [Function declaration vs expression](#function-declaration-vs-expression)
- [Pitfalls](#pitfalls)

---

Hoisting là hành vi JS engine 'đưa' khai báo lên đầu scope trong creation phase trước khi code chạy.

## Tổng quan

Hoisting là gì và xảy ra khi nào.

```js
// TODO: ví dụ minh hoạ
```

## Creation Phase vs Execution Phase

Engine quét khai báo trước khi thực thi.

```js
// TODO: ví dụ minh hoạ
```

## Hoisting với var

Khai báo được hoisted và gán `undefined`.

```js
// TODO: ví dụ minh hoạ
```

## Hoisting với let/const (TDZ)

Được hoisted nhưng không khởi tạo → Temporal Dead Zone.

```js
// TODO: ví dụ minh hoạ
```

## Function declaration vs expression

Function declaration được hoisted toàn bộ; expression thì không.

```js
// TODO: ví dụ minh hoạ
```

## Pitfalls

Các lỗi thường gặp do hiểu sai hoisting.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="var, let, const" href="/fundamentals/var-let-const/" />
  <Card title="Scope & Scope Chain" href="/fundamentals/scope/" />
</Cards>
