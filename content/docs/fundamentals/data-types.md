---
title: "Kiểu dữ liệu & null / undefined / NaN"
description: "Primitive vs reference type, phân biệt null/undefined/NaN, typeof và các đặc thù của Number."
---

> [!NOTE]
> Bài này đang ở dạng **khung sườn (skeleton)** — đã có sẵn outline các mục để dễ học theo flow. Nội dung chi tiết sẽ được bổ sung dần.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Primitive vs Reference](#primitive-vs-reference)
- [null vs undefined vs NaN](#null-vs-undefined-vs-nan)
- [typeof & kiểm tra kiểu](#typeof-kiểm-tra-kiểu)
- [Đặc thù của Number](#đặc-thù-của-number)
- [Pitfalls](#pitfalls)

---

JS có 7 primitive type và object. Hiểu phân biệt primitive vs reference là nền tảng cho copy, so sánh.

## Tổng quan

Danh sách kiểu dữ liệu.

```js
// TODO: ví dụ minh hoạ
```

## Primitive vs Reference

Lưu theo giá trị vs theo tham chiếu.

```js
// TODO: ví dụ minh hoạ
```

## null vs undefined vs NaN

Ý nghĩa và khác biệt từng giá trị.

```js
// TODO: ví dụ minh hoạ
```

## typeof & kiểm tra kiểu

`typeof`, `Array.isArray`, `Number.isNaN`.

```js
// TODO: ví dụ minh hoạ
```

## Đặc thù của Number

Floating point, `Number.MAX_SAFE_INTEGER`, BigInt.

```js
// TODO: ví dụ minh hoạ
```

## Pitfalls

`typeof null === 'object'`, `NaN !== NaN`, v.v.

```js
// TODO: ví dụ minh hoạ
```

## Liên quan

<Cards>
  <Card title="Truthy & Falsy" href="/fundamentals/truthy-falsy/" />
  <Card title="Toán tử & == vs ===" href="/fundamentals/operators/" />
</Cards>
