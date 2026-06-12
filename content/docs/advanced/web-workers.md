---
title: "Web Workers"
description: "Main thread vs worker, postMessage, use case tính toán nặng và limitations."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Main thread vs Worker](#main-thread-vs-worker)
- [postMessage](#postmessage)
- [Use cases](#use-cases)
- [Limitations](#limitations)

---

Web Worker cho phép chạy JS trên thread nền, tránh block main thread / UI.

## Tổng quan

Web Worker là gì.

```js
// TODO: ví dụ minh hoạ
```

## Main thread vs Worker

Mô hình đa luồng của trình duyệt.

```js
// TODO: ví dụ minh hoạ
```

## postMessage

Giao tiếp giữa main và worker.

```js
// TODO: ví dụ minh hoạ
```

## Use cases

Tính toán nặng, xử lý dữ liệu lớn.

```js
// TODO: ví dụ minh hoạ
```

## Limitations

Không truy cập DOM, overhead serialize.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="Event Loop — Deep Dive" href="/async/event-loop/" />
</Cards>
