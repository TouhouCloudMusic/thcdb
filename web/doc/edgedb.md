# 如何链接数据库

1. [安装](https://docs.edgedb.com/get-started/quickstart) EdgeDB CLI
2. 在命令行输入

   ```console

   edgedb instance link
   ```

   ```console

   host: thdb.tz61.top
   port: 5656
   user: edgedb
   database/branch：skip for default
   password:edgedb
   name: 你喜欢的名字
   ```

3. 初始化项目

   ```console

   edgedb project init

   Do you want to initialize a new project? [Y/n]
   > Y
   Specify the name of EdgeDB instance to use with this project [default: instance]:
   > <同上>
   Do you want to use existing instance "thcdb" for the project? [y/n]
   > y
   ```
