---
title: "Promises"
description: "Promise states, then/catch/finally, chaining, Promise.all/race/allSettled/any và pitfalls."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [States](#states)
- [then / catch / finally](#then-catch-finally)
- [Chaining](#chaining)
- [Promise.all / race / allSettled / any](#promiseall-race-allsettled-any)
- [Pitfalls](#pitfalls)

---

Promise đại diện cho kết quả (thành công/thất bại) của một tác vụ async, giải quyết callback hell.

## Tổng quan

Producing vs consuming code.

```js
// TODO: ví dụ minh hoạ
```

## States

pending / fulfilled / rejected.

```js
// TODO: ví dụ minh hoạ
```

## then / catch / finally

Consuming một Promise.

```js
// TODO: ví dụ minh hoạ
```

## Chaining

Nối nhiều bước async.

```js
// TODO: ví dụ minh hoạ
```

## Promise.all / race / allSettled / any

Kết hợp nhiều Promise.

```js
// TODO: ví dụ minh hoạ
```

## Pitfalls

Quên return trong chain, nuốt lỗi.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="async / await" href="/async/async-await/" />
  <Card title="Event Loop — Deep Dive" href="/async/event-loop/" />
</Cards>
