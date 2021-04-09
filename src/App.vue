<template>
  <div id="app">
    <div id="nav">
      <b> 导航部分 </b> |
      <router-link to="/"> 2D知识图谱</router-link> |
      <b>...</b>
      <!-- <router-link to="/about">3D知识图谱</router-link> -->
    </div>
    <router-view/>
  </div>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
