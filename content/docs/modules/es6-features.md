---
title: "Tính năng JavaScript hiện đại (ES6+)"
description: "Hướng dẫn ES6+: destructuring, spread/rest, arrow function, template literal, default parameter, optional chaining, Map/Set và các cú pháp hiện đại kèm ví dụ thực tế."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Khai báo biến: `let` và `const`](#khai-báo-biến-let-và-const)
- [Arrow function](#arrow-function)
- [Template literals](#template-literals)
- [Destructuring](#destructuring)
  - [Array destructuring](#array-destructuring)
  - [Object destructuring](#object-destructuring)
  - [Destructuring trong tham số hàm](#destructuring-trong-tham-số-hàm)
- [Spread và rest: cùng là `...`, khác ngữ cảnh](#spread-và-rest-cùng-là--khác-ngữ-cảnh)
  - [Spread syntax](#spread-syntax)
  - [Rest parameter và rest property](#rest-parameter-và-rest-property)
  - [Shallow copy: giới hạn quan trọng](#shallow-copy-giới-hạn-quan-trọng)
- [Default parameters](#default-parameters)
- [Cú pháp object hiện đại](#cú-pháp-object-hiện-đại)
- [Optional chaining và nullish coalescing](#optional-chaining-và-nullish-coalescing)
- [Collections: `Map`, `Set`, `Symbol`](#collections-map-set-symbol)
- [Các tính năng nên học tiếp](#các-tính-năng-nên-học-tiếp)
- [Pitfalls thường gặp](#pitfalls-thường-gặp)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

**ES6** là tên phổ biến của ECMAScript 2015 — phiên bản đưa JavaScript hiện đại vào sử dụng rộng rãi. Sau đó, ECMAScript phát hành phiên bản mới hằng năm, nên tên **ES6+** thường chỉ tập hợp các cú pháp từ ES2015 trở đi.

Các tính năng trong bài này giúp code ngắn gọn hơn, nhưng mục tiêu không phải là “viết ít ký tự”. Chúng giúp biểu diễn rõ ý định: lấy dữ liệu cần dùng, tạo dữ liệu mới mà không mutate dữ liệu cũ, và xử lý giá trị có thể vắng mặt an toàn hơn.

```text
Dữ liệu API / state
        │
        ├── destructuring ──► lấy đúng field cần dùng
        ├── spread/rest ────► copy, ghép hoặc tách dữ liệu
        └── ?. / ?? ────────► xử lý dữ liệu có thể thiếu
```

> [!IMPORTANT]
> `destructuring`, `spread` và `rest` không tự tạo deep copy. Đặc biệt, `{ ...object }` chỉ tạo **shallow copy**; object hoặc array lồng bên trong vẫn có thể dùng chung tham chiếu.

## Khai báo biến: `let` và `const`

Dùng `const` mặc định; chỉ dùng `let` khi cần gán lại biến. Tránh `var` trong code mới vì `var` có function scope và có thể bị khai báo lại trong cùng scope.

```js
const taxRate = 0.1;
let total = 100;
total = total * (1 + taxRate);

// const chặn việc gán lại binding, không làm object trở thành immutable
const user = { name: "An" };
user.name = "Bình"; // hợp lệ
// user = {};        // TypeError
```

| Từ khoá | Scope | Gán lại | Khai báo lại cùng scope |
|---------|-------|---------|--------------------------|
| `var` | function | Có | Có |
| `let` | block | Có | Không |
| `const` | block | Không | Không |

> [!TIP]
> `const` không có nghĩa “bất biến”. Nếu cần ngăn mutate object, cân nhắc `Object.freeze()` cho shallow freeze hoặc thiết kế dữ liệu immutable.

## Arrow function

Arrow function là cách viết hàm ngắn hơn. Khác biệt quan trọng nhất: nó **không có `this` riêng** mà lấy `this` từ scope bên ngoài (lexical `this`).

```js
const square = (n) => n * n;
const greeting = (name) => `Xin chào, ${name}`;
const log = () => console.log("done");

const cart = {
  items: [100, 200],
  totalWithTax() {
    // Arrow giữ this của totalWithTax, nên this.items dùng được.
    return this.items.map((price) => price * 1.1);
  },
};
```

Khi thân hàm chỉ có một biểu thức, arrow function trả về ngầm định. Muốn trả về object literal, bọc object bằng ngoặc đơn:

```js
const makeUser = (name) => ({ name, active: true });

makeUser("An"); // { name: "An", active: true }
```

Không dùng arrow function khi cần một trong các đặc điểm của function thường:

- Làm method cần `this` động theo object gọi hàm.
- Dùng làm constructor với `new`.
- Dùng `arguments` của chính hàm (thay bằng rest parameter `...args`).

```js
const counter = {
  value: 0,
  // Dùng method shorthand/function thường để this là counter khi gọi counter.increment().
  increment() {
    this.value += 1;
  },
};

// const Person = (name) => { this.name = name; };
// new Person("An"); // TypeError: Person is not a constructor
```

## Template literals

Template literal dùng dấu backtick (`` ` ``), hỗ trợ nội suy `${expression}` và chuỗi nhiều dòng. Nó phù hợp hơn phép nối chuỗi khi nội dung có nhiều biến.

```js
const product = "Bàn phím";
const price = 990_000;

const message = `${product} có giá ${price.toLocaleString("vi-VN")}đ.`;
const html = `
  <article>
    <h2>${product}</h2>
  </article>
`;
```

### Tagged template

Một hàm có thể xử lý template literal trước khi chuỗi được tạo. Đây là cơ chế đằng sau một số thư viện CSS-in-JS hoặc query builder; `String.raw` là ví dụ có sẵn trong JavaScript.

```js
const path = String.raw`C:\new-folder\file.txt`;
console.log(path); // C:\new-folder\file.txt
```

> [!WARNING]
> Nội suy biến vào HTML bằng template literal **không tự escape** dữ liệu. Không gán trực tiếp dữ liệu người dùng vào `innerHTML`; dùng `textContent` hoặc cơ chế render có escape mặc định.

## Destructuring

**Destructuring assignment** là cú pháp lấy phần tử từ array hoặc property từ object và gán vào biến. Nó đặc biệt hữu ích khi đọc response API, props, configuration hoặc tham số hàm.

### Array destructuring

Array destructuring lấy dữ liệu theo **vị trí**.

```js
const colors = ["red", "green", "blue"];
const [primary, secondary] = colors;

console.log(primary);   // "red"
console.log(secondary); // "green"

const [first, , third] = colors; // bỏ qua phần tử thứ hai
const [head, ...tail] = colors;  // head = "red", tail = ["green", "blue"]
```

Có thể đặt giá trị mặc định. Default chỉ được dùng khi phần tử là `undefined`, không áp dụng với `null`.

```js
const [theme = "light", pageSize = 20] = [undefined, null];
console.log(theme);    // "light"
console.log(pageSize); // null

let a = 1;
let b = 2;
[a, b] = [b, a];
console.log(a, b); // 2 1
```

### Object destructuring

Object destructuring lấy dữ liệu theo **tên property**, nên thứ tự property không quan trọng.

```js
const response = {
  id: 42,
  title: "JavaScript",
  author: { name: "An" },
};

const { id, title } = response;
const {
  title: heading,          // đổi tên biến local
  status = "draft",       // default khi response.status là undefined
  author: { name: authorName }, // lấy nested property
} = response;

console.log(heading, status, authorName);
```

Muốn gán vào biến đã khai báo, bọc cả biểu thức trong ngoặc tròn. Nếu không, JavaScript có thể hiểu `{}` là block statement.

```js
let name;
({ name } = { name: "An" });
console.log(name); // "An"
```

> [!WARNING]
> Destructuring nested không tự an toàn với `null`/`undefined`. `const { author: { name } } = response` sẽ lỗi nếu `author` là `undefined` hoặc `null`. Hãy đảm bảo cấu trúc dữ liệu, dùng default phù hợp, hoặc đọc bằng optional chaining.

```js
const apiResponse = {};
const authorName = apiResponse.author?.name ?? "Chưa rõ";
```

### Destructuring trong tham số hàm

Destructure tại nơi nhận tham số để API của hàm nói rõ field nào được dùng. Với tham số có thể bị bỏ qua, đặt default object là `{}`.

```js
function formatUser({ name, role = "member" } = {}) {
  return `${name ?? "Khách"} (${role})`;
}

formatUser({ name: "Lan", role: "admin" }); // "Lan (admin)"
formatUser({ name: "Minh" });                // "Minh (member)"
formatUser();                                 // "Khách (member)"
```

Trade-off: destructuring trong tham số gọn, nhưng nếu hàm có nhiều field hoặc cần log toàn bộ input, nhận `options` rồi destructure ở dòng đầu có thể dễ đọc hơn.

## Spread và rest: cùng là `...`, khác ngữ cảnh

Cùng ký hiệu `...` nhưng hai vai trò trái ngược nhau:

| Cú pháp | Dùng ở đâu | Ý nghĩa |
|---------|-----------|---------|
| **Spread** | Lúc gọi hàm hoặc tạo array/object | Trải một giá trị thành các phần tử/property riêng lẻ |
| **Rest** | Lúc khai báo tham số hoặc destructuring | Gom các phần tử/property còn lại thành array/object |

### Spread syntax

Với array hoặc lời gọi hàm, spread yêu cầu giá trị là **iterable** như array, string, `Set`, `Map` (mỗi entry là một array). Object thông thường không iterable.

```js
const baseRoles = ["reader"];
const roles = [...baseRoles, "editor"]; // tạo array mới

const numbers = [4, 8, 15];
console.log(Math.max(...numbers)); // 15

const chars = [..."JS"]; // ["J", "S"]
```

Với object, spread sao chép các own enumerable property. Property xuất hiện sau sẽ ghi đè property cùng tên xuất hiện trước.

```js
const defaults = { pageSize: 20, sort: "createdAt" };
const query = { ...defaults, page: 2, pageSize: 50 };
// { pageSize: 50, sort: "createdAt", page: 2 }

const user = { id: 1, name: "An" };
const updatedUser = { ...user, name: "Bình" };
// user không bị mutate
```

Cách này rất phổ biến khi cập nhật state theo immutable pattern:

```js
const state = {
  filters: { keyword: "js", page: 1 },
};

const nextState = {
  ...state,
  filters: {
    ...state.filters,
    page: 2,
  },
};
```

### Rest parameter và rest property

Rest parameter gom các đối số còn lại thành một array thực sự, thay thế `arguments` trong đa số trường hợp. Nó phải là tham số cuối cùng.

```js
function sum(first, ...numbers) {
  return first + numbers.reduce((total, n) => total + n, 0);
}

sum(1, 2, 3, 4); // 10
// function invalid(...numbers, last) {} // rest phải đứng cuối
```

Object rest và array rest gom phần chưa destructure:

```js
const user = { id: 1, name: "An", passwordHash: "secret", role: "admin" };
const { passwordHash, ...publicUser } = user;
// publicUser = { id: 1, name: "An", role: "admin" }

const [current, ...upcoming] = ["Jan", "Feb", "Mar"];
// current = "Jan", upcoming = ["Feb", "Mar"]
```

### Shallow copy: giới hạn quan trọng

Array/object spread tạo container mới, nhưng chỉ copy một cấp. Giá trị nested vẫn là cùng tham chiếu.

```js
const original = {
  name: "An",
  settings: { theme: "light" },
};

const copy = { ...original };
copy.settings.theme = "dark";

console.log(original.settings.theme); // "dark" — bị thay đổi theo
console.log(original.settings === copy.settings); // true
```

Nếu thật sự cần clone sâu cho dữ liệu có thể clone, dùng `structuredClone`:

```js
const deepCopy = structuredClone(original);
deepCopy.settings.theme = "light";
console.log(original.settings.theme); // "dark" — không bị deepCopy sửa
```

> [!NOTE]
> `structuredClone` không clone được function và một số object đặc biệt. Đừng dùng `JSON.parse(JSON.stringify(value))` như giải pháp mặc định: nó làm mất `undefined`, function, `Symbol`, và biến `Date` thành string.

## Default parameters

Default parameter cung cấp giá trị khi đối số bị thiếu hoặc là `undefined`. Nó **không** thay thế `null`, `0`, `false` hay chuỗi rỗng.

```js
function createPager(page = 1, pageSize = 20) {
  return { page, pageSize };
}

createPager();             // { page: 1, pageSize: 20 }
createPager(undefined, 50); // { page: 1, pageSize: 50 }
createPager(null, 50);      // { page: null, pageSize: 50 }
```

Default có thể tham chiếu tham số đứng trước:

```js
function connect(host, port = host === "localhost" ? 3000 : 443) {
  return `${host}:${port}`;
}

connect("localhost"); // "localhost:3000"
```

Khi muốn coi cả `null` là thiếu, xử lý trong thân hàm bằng `??`:

```js
function getPageSize(value) {
  return value ?? 20;
}
```

## Cú pháp object hiện đại

ES6+ bổ sung nhiều cách viết object sát với ý định hơn.

```js
const name = "An";
const age = 20;
const field = "email";

const user = {
  name,              // property shorthand: name: name
  age,
  [field]: "an@example.com", // computed property name
  greet() {          // method shorthand
    return `Chào ${this.name}`;
  },
};

console.log(user.email); // "an@example.com"
console.log(user.greet()); // "Chào An"
```

Computed property đặc biệt hữu ích khi cập nhật object theo key động:

```js
function updateField(form, field, value) {
  return { ...form, [field]: value };
}

updateField({ name: "An", email: "old@example.com" }, "email", "new@example.com");
```

## Optional chaining và nullish coalescing

Đây là tính năng sau ES6 nhưng thường đi cùng nhóm cú pháp hiện đại.

- `?.` dừng chuỗi truy cập và trả về `undefined` nếu vế bên trái là `null` hoặc `undefined`.
- `??` dùng giá trị bên phải chỉ khi vế trái là `null` hoặc `undefined`.

```js
const user = {
  profile: { displayName: "An" },
  preferences: { pageSize: 0 },
};

const city = user.address?.city;               // undefined, không lỗi
const name = user.profile?.displayName ?? "Khách"; // "An"
const pageSize = user.preferences?.pageSize ?? 20;  // 0 (giữ giá trị hợp lệ)
```

Đừng thay `??` bằng `||` nếu `0`, `false` hoặc `""` là giá trị hợp lệ:

```js
const retries = 0;
console.log(retries || 3); // 3  — không mong muốn nếu 0 hợp lệ
console.log(retries ?? 3); // 0
```

`?.` không che mọi lỗi và không thay thế validation. Nó chỉ xử lý trường hợp giá trị ngay trước nó là `null`/`undefined`.

```js
const user = { profile: undefined };
// user?.profile.name;  // TypeError: profile là undefined rồi vẫn truy cập .name
user?.profile?.name;    // undefined
```

## Collections: `Map`, `Set`, `Symbol`

### `Map`

`Map` lưu cặp key-value, chấp nhận key thuộc mọi kiểu (kể cả object) và có API rõ ràng về kích thước, thêm, đọc, xoá.

```js
const visits = new Map();
const user = { id: 1 };

visits.set(user, 1);
visits.set(user, visits.get(user) + 1);

console.log(visits.get(user)); // 2
console.log(visits.size);      // 1
```

### `Set`

`Set` chứa các giá trị duy nhất; dùng tốt để loại phần tử trùng hoặc kiểm tra membership.

```js
const tags = ["js", "web", "js", "es6"];
const uniqueTags = [...new Set(tags)];
// ["js", "web", "es6"]

const permissions = new Set(["read", "write"]);
permissions.has("write"); // true
```

### `Symbol`

`Symbol()` tạo giá trị primitive duy nhất. Nó thường được dùng làm key để tránh đụng tên property hoặc để tham gia các protocol của JavaScript như `Symbol.iterator`.

```js
const internalId = Symbol("internalId");
const account = {
  name: "An",
  [internalId]: "private-001",
};

console.log(account[internalId]); // "private-001"
```

> [!TIP]
> Dùng object `{}` cho record đơn giản có key là string. Dùng `Map` khi cần key không phải string, cần `.size`, hoặc thường xuyên thêm/xoá/duyệt entries. Dùng `Set` khi điều quan trọng là tính duy nhất của giá trị.

## Các tính năng nên học tiếp

ES6+ còn nhiều tính năng quan trọng. Các chủ đề sau có bài riêng hoặc nên học sau khi nắm cú pháp trong trang này:

| Chủ đề | Dùng khi |
|--------|----------|
| Class | Mô hình hoá đối tượng với class, kế thừa, private field |
| Modules | Chia code thành file, quản lý dependency |
| Promise, `async`/`await` | Xử lý tác vụ bất đồng bộ |
| Iterator / Generator | Tự định nghĩa cách duyệt hoặc tạo dữ liệu theo từng bước |
| `Proxy`, `Reflect` | Intercept thao tác trên object, metaprogramming |
| `BigInt`, `globalThis`, `Array.prototype.at` | Các API và tiện ích mới hơn |

## Pitfalls thường gặp

1. **Dùng spread rồi tưởng đã clone sâu**: `{ ...state }` không copy object nested. Copy từng nhánh thay đổi hoặc dùng `structuredClone` khi phù hợp.
2. **Dùng `||` để set default cho số/boolean**: `0`, `false`, `""` bị coi là thiếu. Dùng `??` nếu chỉ muốn fallback khi nullish.
3. **Destructure nested dữ liệu API chưa kiểm tra**: response thiếu nhánh sẽ ném `TypeError`. Dùng `?.`, default object hoặc validation schema.
4. **Dùng arrow cho mọi method**: arrow không có `this` riêng và không làm constructor được. Dùng method shorthand/function thường khi cần dynamic `this`.
5. **Mutation khi merge bằng `Object.assign`**: `Object.assign(target, source)` sửa `target`; `{ ...target, ...source }` tạo object mới.
6. **Nhầm spread và rest**: spread là “trải ra” ở expression; rest là “gom lại” trong binding/parameter.

## Cheat sheet

| Nhu cầu | Cú pháp | Ví dụ |
|---------|---------|-------|
| Lấy property | Object destructuring | `const { id, name } = user` |
| Đổi tên property | Alias | `const { name: displayName } = user` |
| Lấy phần còn lại | Rest | `const { id, ...data } = user` |
| Copy/ghép array | Array spread | `const all = [...a, ...b]` |
| Copy/cập nhật object | Object spread | `const next = { ...user, name: "An" }` |
| Gom đối số | Rest parameter | `function fn(...args) {}` |
| Giá trị mặc định | Default parameter | `function fn(limit = 20) {}` |
| Đọc property an toàn | Optional chaining | `user.profile?.name` |
| Fallback chỉ cho nullish | Nullish coalescing | `value ?? fallback` |
| Loại giá trị trùng | `Set` | `[...new Set(items)]` |

## Bài liên quan

<Cards>
  <Card title="Toán tử & == vs ===" href="/fundamentals/operators/" description="So sánh spread/rest, optional chaining, ?? và các toán tử quan trọng." />
  <Card title="Kiểu dữ liệu" href="/fundamentals/data-types/" description="Hiểu reference, shallow copy và structuredClone trước khi copy object." />
  <Card title="Function cơ bản" href="/function-closure/function-basics/" description="Nền tảng về tham số, return và các cách khai báo hàm." />
  <Card title="import / export" href="/modules/import-export/" description="Chia code hiện đại thành ES Modules." />
  <Card title="Generators & Iterators" href="/advanced/generators-iterators/" description="Tìm hiểu protocol lặp và generator." />
</Cards>
