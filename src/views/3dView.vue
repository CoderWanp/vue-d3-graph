<template>
  <div class="threeView">
    <!-- <img alt="Vue logo" src="../assets/logo.png"> -->
    <threeGraph />
  </div>
</template>

<script>
// @ is an alias to /src
import threeGraph from '@/components/threeGraph.vue'

export default {
  name: 'threeView',
  components: {
    threeGraph
  }
}
</script>
