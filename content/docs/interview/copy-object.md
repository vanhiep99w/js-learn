---
title: "Copy object trong JavaScript"
description: "Câu hỏi phỏng vấn về reference, shallow copy, deep copy, structuredClone và các giới hạn của JSON."
---

> [!NOTE]
> **Trọng tâm phỏng vấn:** trước khi chọn cách copy, hãy xác định dữ liệu có object lồng nhau hay không và có chứa kiểu dữ liệu đặc biệt như `Date`, `Map`, hàm, hoặc tham chiếu vòng hay không.

## Mục lục

- [Câu trả lời ngắn khi phỏng vấn](#câu-trả-lời-ngắn-khi-phỏng-vấn)
- [Vì sao gán object không tạo bản sao](#vì-sao-gán-object-không-tạo-bản-sao)
- [Shallow copy — copy nông](#shallow-copy--copy-nông)
  - [Spread syntax](#spread-syntax)
  - [Object.assign](#objectassign)
  - [Giới hạn của shallow copy](#giới-hạn-của-shallow-copy)
- [Deep copy — copy sâu](#deep-copy--copy-sâu)
  - [structuredClone — lựa chọn mặc định hiện đại](#structuredclone--lựa-chọn-mặc-định-hiện-đại)
  - [JSON stringify/parse — chỉ cho dữ liệu JSON thuần](#json-stringifyparse--chỉ-cho-dữ-liệu-json-thuần)
  - [Thư viện và hàm tự viết](#thư-viện-và-hàm-tự-viết)
- [Cập nhật bất biến object lồng nhau](#cập-nhật-bất-biến-object-lồng-nhau)
- [So sánh các cách copy](#so-sánh-các-cách-copy)
- [Câu hỏi phỏng vấn thường gặp](#câu-hỏi-phỏng-vấn-thường-gặp)
- [Checklist trả lời](#checklist-trả-lời)
- [Bài liên quan](#bài-liên-quan)

## Câu trả lời ngắn khi phỏng vấn

Object trong JavaScript được truyền và lưu bằng **tham chiếu**. Vì vậy `const b = a` không copy object; cả `a` và `b` cùng trỏ tới một object.

- Dùng `{ ...obj }` hoặc `Object.assign({}, obj)` khi chỉ cần **shallow copy**: các property ở cấp đầu được copy, object lồng bên trong vẫn dùng chung tham chiếu.
- Dùng `structuredClone(obj)` khi cần **deep copy** dữ liệu clone được và muốn các object lồng nhau độc lập.
- Chỉ dùng `JSON.parse(JSON.stringify(obj))` với dữ liệu JSON thuần. Cách này làm mất hoặc biến đổi nhiều kiểu dữ liệu JavaScript.

## Vì sao gán object không tạo bản sao

Biến object không chứa toàn bộ dữ liệu object; nó giữ một tham chiếu tới vùng dữ liệu đó. Phép gán chỉ sao chép tham chiếu.

```text
const copy = original

original ──────┐
               ▼
          { name: "An" }
               ▲
               │
copy ──────────┘
```

```js
const original = { name: "An", settings: { theme: "dark" } };
const copy = original;

copy.name = "Bình";
copy.settings.theme = "light";

console.log(original.name);           // "Bình"
console.log(original.settings.theme); // "light"
console.log(original === copy);       // true
```

Hai biến cùng tham chiếu một object, nên thay đổi qua biến nào cũng thay đổi dữ liệu mà biến còn lại nhìn thấy.

> [!TIP]
> Với primitive như `number`, `string`, `boolean`, phép gán sao chép giá trị. Quy tắc “gán không copy” trong ngữ cảnh này là về object, array và function — tức các giá trị tham chiếu.

## Shallow copy — copy nông

Shallow copy tạo một object ngoài mới. Các property primitive ở cấp đầu độc lập, nhưng property là object, array hoặc function vẫn giữ nguyên tham chiếu cũ.

```text
original                         shallow
┌─────────────────────────┐     ┌─────────────────────────┐
│ name: "An"              │     │ name: "Bình"            │
│ address ─────────────┐   │     │ address ─────────────┐   │
└──────────────────────│───┘     └──────────────────────│───┘
                       │                                │
                       └──────────► { city: "Hà Nội" } ◄┘
```

### Spread syntax

Spread syntax là cách ngắn gọn, thường dùng nhất.

```js
const original = {
  name: "An",
  age: 24,
  address: { city: "Hà Nội" },
};

const copy = { ...original };

copy.age = 25;
console.log(original.age); // 24 — primitive ở cấp đầu đã độc lập

copy.address.city = "Đà Nẵng";
console.log(original.address.city); // "Đà Nẵng" — object lồng vẫn dùng chung

console.log(original === copy); // false
console.log(original.address === copy.address); // true
```

Spread copy các **own enumerable properties** — property thuộc chính object và có thể được duyệt. Nó không copy property kế thừa từ prototype, descriptor property, hay prototype của object nguồn.

### Object.assign

`Object.assign` cũng shallow copy. Nó hữu ích khi muốn gộp nhiều object theo thứ tự từ trái sang phải; key xuất hiện sau sẽ ghi đè key trước.

```js
const defaults = { theme: "light", language: "vi" };
const userOptions = { theme: "dark" };

const options = Object.assign({}, defaults, userOptions);
console.log(options); // { theme: "dark", language: "vi" }
```

Với một object nguồn duy nhất, hai cách sau có kết quả tương đương trong phần lớn tình huống:

```js
const a = { ...original };
const b = Object.assign({}, original);
```

> [!WARNING]
> `Object.assign(target, source)` **thay đổi `target`**. Đừng vô tình truyền object state hiện có làm `target` nếu bạn cần giữ dữ liệu bất biến.
>
> ```js
> Object.assign(original, { name: "Bình" }); // sửa trực tiếp original
> ```

### Giới hạn của shallow copy

Shallow copy là lựa chọn đúng khi chỉ thay đổi property ở cấp đầu. Nếu thay đổi một nhánh lồng nhau, hãy copy lại từng object trên đường đi đến nhánh đó.

```js
const user = {
  name: "An",
  preferences: {
    notification: { email: true, sms: false },
  },
};

// Sai nếu muốn giữ user gốc không đổi: preferences vẫn được dùng chung.
const wrong = { ...user };
wrong.preferences.notification.email = false;

console.log(user.preferences.notification.email); // false
```

Phần [Cập nhật bất biến object lồng nhau](#cập-nhật-bất-biến-object-lồng-nhau) cho cách copy đúng theo từng cấp.

## Deep copy — copy sâu

Deep copy tạo một cấu trúc mới ở mọi cấp cần thiết. Sửa object con trong bản copy sẽ không ảnh hưởng object gốc.

```js
const original = { profile: { name: "An" } };
const copy = structuredClone(original);

copy.profile.name = "Bình";
console.log(original.profile.name); // "An"
console.log(original.profile === copy.profile); // false
```

### structuredClone — lựa chọn mặc định hiện đại

`structuredClone` là API có sẵn trong trình duyệt hiện đại và Node.js hiện đại. Nó xử lý tham chiếu vòng và clone được nhiều kiểu built-in như `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer` và typed array.

```js
const original = {
  createdAt: new Date("2026-01-01T00:00:00Z"),
  tags: new Set(["javascript", "interview"]),
  scores: new Map([["An", 10]]),
};

const copy = structuredClone(original);
copy.tags.add("deep-copy");

console.log(copy.createdAt instanceof Date); // true
console.log(original.tags.has("deep-copy")); // false
```

Nó cũng xử lý object có tham chiếu vòng, điều mà JSON không làm được.

```js
const node = { name: "root" };
node.self = node;

const copy = structuredClone(node);
console.log(copy !== node); // true
console.log(copy.self === copy); // true
```

> [!WARNING]
> `structuredClone` ném `DataCloneError` với các giá trị không thuộc structured-cloneable, ví dụ `function`, `WeakMap`, `WeakSet`, `Symbol` và DOM node. Instance của class tự định nghĩa cũng không giữ nguyên prototype hay method của class sau khi clone.
>
> Nếu object có hàm hoặc instance class, hãy thiết kế rõ cách tạo lại dữ liệu thay vì mặc định deep clone toàn bộ.

### JSON stringify/parse — chỉ cho dữ liệu JSON thuần

Mẫu sau từng phổ biến, nhưng chỉ an toàn khi dữ liệu gồm object, array, string, number hữu hạn, boolean và `null`.

```js
const original = {
  name: "An",
  tags: ["js", "interview"],
  address: { city: "Hà Nội" },
};

const copy = JSON.parse(JSON.stringify(original));
```

Các dữ liệu sau bị lỗi, mất đi hoặc bị đổi kiểu:

| Giá trị | Kết quả khi dùng JSON | Hệ quả |
|---|---|---|
| `undefined`, function, `Symbol` trong object | Bị bỏ khỏi object | Mất property |
| `undefined`, function, `Symbol` trong array | Thành `null` | Dữ liệu bị thay đổi |
| `Date` | Thành string ISO | Không còn method của `Date` |
| `Map`, `Set`, `RegExp` | Thành `{}` trong trường hợp thông thường | Mất nội dung/ý nghĩa |
| `NaN`, `Infinity` | Thành `null` | Giá trị số bị đổi |
| `BigInt` | Ném lỗi | Không serialize được |
| Circular reference | Ném lỗi | Không thể stringify |

```js
const original = {
  createdAt: new Date("2026-01-01"),
  calculate: () => 42,
  score: NaN,
};

const copy = JSON.parse(JSON.stringify(original));
console.log(copy);
// { createdAt: "2026-01-01T00:00:00.000Z", score: null }
```

Nói ngắn gọn: JSON copy phù hợp cho payload JSON đơn giản, không phải một deep-clone tổng quát của JavaScript.

### Thư viện và hàm tự viết

Một thư viện deep-clone phù hợp khi dự án phải hỗ trợ môi trường không có `structuredClone`, hoặc dữ liệu có quy tắc clone riêng. Ví dụ, một class có thể cần một factory/hàm chuyển đổi để tạo đúng instance mới.

Không nên tự viết deep clone đệ quy cho mọi object trong bài phỏng vấn hoặc code ứng dụng thông thường. Một implementation đúng phải xử lý circular reference, `Date`, `Map`, `Set`, symbol key, descriptor, prototype và nhiều edge case khác.

> [!TIP]
> Nếu yêu cầu chỉ là cập nhật state, thường không cần deep clone toàn bộ. Hãy copy đúng các nhánh thay đổi; cách này rõ ràng hơn và tránh tạo nhiều dữ liệu không cần thiết.

## Cập nhật bất biến object lồng nhau

**Immutability** nghĩa là không sửa object cũ mà tạo object mới cho phần dữ liệu thay đổi. Đây là mẫu phổ biến trong React, Redux và reducer vì có thể so sánh tham chiếu để biết nhánh nào đã thay đổi.

Ví dụ cần đổi `email` trong `user.preferences.notifications`:

```js
const user = {
  id: 1,
  name: "An",
  preferences: {
    theme: "dark",
    notifications: { email: true, sms: false },
  },
};

const nextUser = {
  ...user,
  preferences: {
    ...user.preferences,
    notifications: {
      ...user.preferences.notifications,
      email: false,
    },
  },
};

console.log(user.preferences.notifications.email); // true
console.log(nextUser.preferences.notifications.email); // false
console.log(user.preferences === nextUser.preferences); // false
console.log(user.name === nextUser.name); // true
```

Mỗi object nằm trên đường đến property thay đổi được copy. Các nhánh không liên quan, như `name`, vẫn tái sử dụng giá trị/tham chiếu cũ. Đây là lý do cách này thường tốt hơn deep clone toàn bộ state.

## So sánh các cách copy

| Cách | Độ sâu | Dùng khi | Giới hạn chính |
|---|---|---|---|
| `const b = a` | Không copy | Muốn hai biến cùng quản lý một object | Sửa qua một biến ảnh hưởng biến kia |
| `{ ...a }` | Shallow | Cập nhật property cấp đầu | Object lồng vẫn dùng chung |
| `Object.assign({}, a)` | Shallow | Gộp/copy object cấp đầu | Object lồng vẫn dùng chung; target có thể bị sửa |
| `structuredClone(a)` | Deep | Dữ liệu clone được, cần độc lập hoàn toàn | Không clone function, DOM node, `WeakMap`, `WeakSet`, `Symbol`; không giữ prototype class tùy biến |
| `JSON.parse(JSON.stringify(a))` | Deep cho JSON thuần | Payload JSON đơn giản | Mất/đổi nhiều kiểu; không có circular reference |

## Câu hỏi phỏng vấn thường gặp

### `{ ...obj }` có phải deep copy không?

Không. Nó là shallow copy. Nếu `obj` có `obj.nested`, thì `copy.nested === obj.nested` vẫn là `true`.

```js
const obj = { nested: { value: 1 } };
const copy = { ...obj };

console.log(copy.nested === obj.nested); // true
```

### `Object.assign` và spread khác nhau thế nào?

Cả hai đều shallow copy các own enumerable properties. Spread phù hợp để tạo object mới một cách dễ đọc. `Object.assign` tiện khi gộp nhiều nguồn, nhưng tham số đầu tiên là target và target sẽ bị mutate.

### Khi nào không nên dùng `structuredClone`?

Không dùng nó cho object chứa function, DOM node, `WeakMap`, `WeakSet`, hoặc khi cần giữ nguyên instance/prototype của class tự định nghĩa. Cũng không dùng deep clone toàn bộ chỉ để đổi một property nested trong state; copy theo nhánh thay đổi sẽ ít tốn kém hơn.

### Làm sao kiểm tra bản copy có thực sự độc lập?

Kiểm tra cả tham chiếu cấp ngoài lẫn object lồng, sau đó sửa bản copy và xác nhận object gốc không đổi.

```js
const original = { nested: { value: 1 } };
const copy = structuredClone(original);

console.log(original !== copy); // true
console.log(original.nested !== copy.nested); // true

copy.nested.value = 2;
console.log(original.nested.value); // 1
```

## Checklist trả lời

> [!IMPORTANT]
> 1. Nói rõ `const b = a` chỉ copy **reference**, không tạo object mới.
> 2. Phân biệt shallow copy và deep copy bằng ví dụ object lồng nhau.
> 3. Nêu `{ ...obj }` và `Object.assign({}, obj)` là shallow copy.
> 4. Ưu tiên `structuredClone` cho deep copy dữ liệu clone được.
> 5. Giải thích vì sao JSON copy không tổng quát: mất kiểu dữ liệu và không xử lý được circular reference.
> 6. Với state lồng nhau, copy các nhánh thay đổi thay vì deep clone mọi thứ.

## Bài liên quan

<Cards>
  <Card title="Object trong JavaScript" href="/objects-prototypes/object/" description="Property, reference, shallow/deep copy và các thao tác object nền tảng." />
  <Card title="Kiểu dữ liệu JavaScript" href="/fundamentals/data-types/" description="Primitive, reference type, null, undefined và cách so sánh." />
  <Card title="Tổng hợp câu hỏi JS phỏng vấn" href="/interview/js-interview-questions/" description="Danh sách câu hỏi phỏng vấn JavaScript theo chủ đề." />
</Cards>
