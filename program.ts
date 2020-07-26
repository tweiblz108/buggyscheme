// type Lambda = (lambda: Lambda, n: number) => number

// ((lambda, n) => lambda(lambda, n))((lambda: Lambda, n: number) => {
//   if (n < 50000) {
//     return lambda(lambda, n + 1)
//   } else {
//     return (n + n + n)
//   }
// }, 1)

// const simpleAdd = (x: number, y: number) => x + y
// const test00 = simpleAdd(4, 6)

// const curriedAdd = (x: number) => (y: number) => x + y
// const test01 = curriedAdd(4)(2)
// const test02 = curriedAdd(15)
// const test03 = test02(5)

// const fn00 = (name: string, age: number, single: boolean) => true
// type test07 = Parameters<typeof fn00>

// type Params<F extends (...args: any[]) => any> = F extends ((...args: infer A) => any) ? A : never
// type test08 = Params<typeof fn00>

// type ObjectInfer<O> = O extends {a: infer A} ? A : never
// const obj = { a: 'Hello' }
// type test17 = ObjectInfer<typeof obj>

// // 标注类型
// // 类型定义
// // 类型运算
// /*
//   将泛型理解为一种类型运算，定义泛型即是定义类型运算函数
//   原子类型，元组，数组，接口，union
//   运算符 | &
//   interface 自动聚合 限于 object class function
// */

// enum AAA {
//   FOO = 'FOO',
//   BAR = 'BAR'
// }

// type size = 'a' | 'b'

// type sizekey = keyof size

// type SizeMap = {
//   [k in size]: number
// }

// type bbb = Record0<size, number>

// type ReturnType0<T> = T extends (...args: any[]) => infer R ? R : never

// type a = keyof any

// type Record0<K extends keyof any, T> = { [P in K]: T}

// type Size = 'small' | 'default' | 'big'

// type b = keyof Size
// type SizeMap0 = Record0<Size, number>

// // const toCurry = (name: string, age: number, single: boolean) => true
// // const curried = curry(toCurry)

// // const test0 = curried('Jane')('26', true)
// // const test1 = curried(R.__, 26)('Jane', R.__)(R.__)([true])
