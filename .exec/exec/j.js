const exec = require("child_process").exec

exec("bozorth3 -p \"C:/Users/King Solo/Desktop/projects/electron-react-boilerplate/.db/6b8669ea-07b9-429c-8e11-e46e33fbb00a.xyt\" -G \"C:/Users/King Solo/Desktop/projects/electron-react-boilerplate/.db/m.lis\"",(err,stdo,stde)=>{
console.log(stdo,stde,err)
})
