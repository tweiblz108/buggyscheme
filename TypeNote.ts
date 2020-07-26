// //同态变换
// // typeof used for identifier
// // keyof any always return number | string | symbol
// // keyof map return the keys, for literals, equals keyof of its type
// // keyof type equals its interface string => String
// // keyof set  每一个项的 keyof 然后合并

// type Partial0<T> = { [P in keyof T]?: T[P] };
// type Required0<T> = { [P in keyof T]-?: T[P] };
// type Readonly0<T> = { readonly [P in keyof T]: T[P] };
// type Mutable<T> = { -readonly [P in keyof T]: T[P] };
