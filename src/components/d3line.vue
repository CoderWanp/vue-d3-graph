<template>
  <div class="lineContainer">
    <svg width="500" height="270">
      <g style="transform: translate(0, 10px)">
        <path :d="line" />
      </g>
    </svg>
  </div>
</template>

<script>
  export default {
    name: 'd3line',
    data() {
      return {
        data: [99, 71, 78, 25, 36, 92],
        line: '',
      };
    },
    mounted() {
      this.calculatePath();
    },
    methods: {
      getScales() {
        const x = d3.scaleTime().range([0, 430]);
        const y = d3.scaleLinear().range([210, 0]);
        d3.axisLeft().scale(x);
        d3.axisBottom().scale(y);
        x.domain(d3.extent(this.data, (d, i) => i));
        y.domain([0, d3.max(this.data, d => d)]);
        return { x, y };
      },
      calculatePath() {
        const scale = this.getScales();
        const path = d3.line()
          .x((d, i) => scale.x(i))
          .y(d => scale.y(d));
        this.line = path(this.data);
      },
    },
  }
</script>

<style lang="scss" scoped>
.lineContainer {
  position: relative;
  border: 2px #000 solid;
  background-color: #9dadc1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  svg {
    margin: 25px;
    path {
      fill: none;
      stroke: #76BF8A;
      stroke-width: 3px;
    }
  }
}
</style>