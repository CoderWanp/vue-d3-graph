<template>
  <div class="home">
    <d3graph />
  </div>
</template>

<script>
import d3graph from '@/components/d3graph.vue'
export default {
  components: {
    d3graph
  },
  created () {
    console.log(this.$el)
  },
  mounted () {
    console.log(this.$el)
  }
}
</script>

<style lang="scss">
// svg {
//   margin: 25px;
//   path {
//     fill: none;
//     stroke: #76BF8A;
//     stroke-width: 3px;
//   }
// }
</style>
