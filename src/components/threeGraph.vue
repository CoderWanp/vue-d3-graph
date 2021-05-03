<template>
  <div class="three-container">
    <h1>3D图谱展示</h1>
    <el-button style="margin-top: 15px;" @click="update">图数据切换，动态更新</el-button>
    <div id="3d-graph" class="three-graph"></div>
    <!-- 绘制图例 -->
    <div id="indicator">
      <!-- 利用item 遍历一个数组 利用index 遍历另外一个数组 -->
      <div v-for="(name, index) in names" :key="index">
        <span
          :data-state="states[index]"
          :data-index="index"
          :style="{ backgroundColor: states[index] === 'on' ? nodeColors[index] : '#aaa' }"
        ></span>
        {{ name }}
      </div>
    </div>
    <!-- 绘制右边显示结果 -->
    <div id="info" v-show="selectNodeData.name !== undefined">
      <h4 :style="{ color: selectNodeData.color }">{{ selectNodeData.name }}</h4>
      <p v-for="(item, key) in selectNodeData.properties" :key="item">
        <span>{{ key }}</span>
        {{ item }}
      </p>
    </div>
  </div>
</template>

<script>
import ForceGraph3D from '3d-force-graph'
// threejs的精灵标签，用于文字的展示
import SpriteText from 'three-spritetext'
export default {
  name: 'threeGraph',
  mounted () {
    this.threeInit()
  },
  data () {
    return {
      // ForceGraph3D对象，供全局调用，实现动态更新
      Graph: {},
      // 根据graph数据的变化，threeRender()进行图形渲染
      graph: require('../data/records.json'),
      // neoJsonParser()处理graph后返回的结果
      data: {},
      // threeRender()最终展示到页面上的数据（节点隐藏功能）
      nodes: [],
      links: [],
      // 图例的名称、对应的颜色以及图例状态
      names: ['企业', '贸易类型', '地区', '国家'],
      states: ['on', 'on', 'on', 'on'],
      nodeColors: ['#55ffff', '#aaaaff', '#4e88af', '#ca635f'],
      selectNodeData: {} // 选中节点的详细信息展示
    }
  },
  methods: {
    // 视图更新
    update () {
      if (this.graph.length <= 20) {
        this.graph = require('../data/top5.json')
      } else {
        this.graph = require('../data/records.json')
      }
      // console.log(this.graph)
      console.log(this.graph.length)
      this.neoJsonParser(this.graph)
      // console.log(this.Graph)
      // 更新前清空DOM内canvas元素
      // 注意固定容器的宽高，防止渲染时容器塌陷
      document.getElementById('3d-graph').innerHTML = ''
      this.threeRender()

      // 更新数据暂不能用，卡死
      // this.threeUpdate({
      //   nodes: [],
      //   links: []
      // })
    },
    // d3初始化，包括数据解析、数据渲染
    threeInit () {
      this.neoJsonParser(this.graph)
      this.threeRender()
    },
    /*eslint-disable*/
    neoJsonParser (json) {
      const nodes =[]
      const links = [] // 存放节点和关系
      const nodeSet = [] // 存放去重后nodes的id

      for (let item of json) {
        // console.log(item.p.start instanceof Array)
        // console.log(item.p)
        // 重新更改data格式
        if(nodeSet.indexOf(item.p.start.identity) == -1){
          nodeSet.push(item.p.start.identity)
          nodes.push({
            id: item.p.start.identity,
            label: item.p.start.labels[0],
            properties: item.p.start.properties
          })
        }
        if(nodeSet.indexOf(item.p.end.identity) == -1){
          nodeSet.push(item.p.end.identity)
          nodes.push({
            id: item.p.end.identity,
            label: item.p.end.labels[0],
            properties: item.p.end.properties
          })
        }
        links.push({
          source: item.p.segments[0].relationship.start,
          target: item.p.segments[0].relationship.end,
          type: item.p.segments[0].relationship.type,
          properties: item.p.segments[0].relationship.properties
        })
      }
      console.log(nodes)
      console.log(links)
      this.links = links
      this.nodes = nodes
      this.data = { nodes, links }
    },
    threeRender () {
      // DOM初始化及数据挂载
      const elm = document.getElementById('3d-graph')
      this.Graph = ForceGraph3D()(elm)
        .graphData(this.data)

      // 设置画布样式、节点及关系样式、事件绑定等
      this.Graph.height(650).width(1200)
        .backgroundColor('#000')
        // 节点样式和标签设置
        .nodeRelSize(7)
        .nodeColor(node => {
          let index = 0
          switch(node.label) {
            case 'Enterprise': break;
            case 'Type': index = 1;break;
            case 'Region': index = 2;break;
            default: index = 3;break;
          }
          return this.nodeColors[index]
        })
        // .nodeAutoColorBy('label')
        // 给节点添加文字
        // .nodeThreeObjectExtend(true)
        .nodeThreeObject(node => {
          const sprite = new SpriteText(node.properties.name)
          sprite.material.depthWrite = false // make sprite background transparent
          // 设置文字颜色
          let index = 0
          switch(node.label) {
            case 'Enterprise': break;
            case 'Type': index = 1;break;
            case 'Region': index = 2;break;
            default: index = 3;break;
          }
          sprite.color = this.nodeColors[index]
          sprite.textHeight = 8
          return sprite
        })
        .nodeThreeObjectExtend(true)
        .nodeLabel(node => `${node.label}: ${node.properties.name}`)
        .nodeOpacity(0.75)
        // 节点事件绑定
        .onNodeHover(node => elm.style.cursor = node ? 'pointer' : null)
        .onNodeClick(node => {
          console.log(node)
          //设置#info h4样式的颜色为该节点的颜色，文本为该节点name
          this.$set(this.selectNodeData, 'id', node.id)
          this.$set(this.selectNodeData, 'name', node.properties.name)
          // 获取节点类型对应的颜色
          let index = 0
          switch(node.label) {
            case 'Enterprise': break;
            case 'Type': index = 1;break;
            case 'Region': index = 2;break;
            default: index = 3;break;
          }
          this.$set(this.selectNodeData, 'color', this.nodeColors[index])
          this.$set(this.selectNodeData, 'properties', node.properties)
        })
        // 关系样式
        // .linkColor('#bbb')
        // .linkColor(link => {
        //   let index = 0
        //   const colors = ['#faa']
        //   switch(link.type) {
        //     case 'export': break;
        //     case 'type': index = 1;break;
        //     case 'locate': index = 2;break;
        //     default: index = 3;break;
        //   }
        //   return this.nodeColors[index]
        // })
        // .linkOpacity(1)
      
      // Spread nodes a little wider
      this.Graph.d3Force('charge').strength(-150)
    },
    threeUpdate (data) {
      this.Graph.graphData({
        data
      })
    },
    // 随机生成生成一个规模为N的图
    createRandomGraph (N = 300) {
      return {
        nodes: [...Array(N).keys()].map(i => ({ id: i })),
        links: [...Array(N).keys()]
          .filter(id => id)
          .map(id => ({
            source: id,
            target: Math.round(Math.random() * (id - 1))
          }))
      }
    }
  },
}
</script>

<style lang="scss" scoped>
.three-container {
  position: relative;
  border: 2px #000 solid;
  background-color: #9dadc1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  overflow: hidden;
  .three-graph {
    width: 1200px;
    height: 650px;
    background-color: #000;
    margin: 20px 0px;
    border: 2px #fff solid;
  }
  #indicator {
    position: absolute;
    left: 50px;
    bottom: 30px;
    text-align: left;
    color: #f2f2f2;
    font-size: 14px;
    font-weight: bold;
    & > div {
      margin-bottom: 4px;
    }
    span {
      display: inline-block;
      width: 32px;
      height: 16px;
      position: relative;
      top: 2px;
      margin-right: 8px;
    }
  }
  /*悬浮节点的info样式*/
  #info {
    position: absolute;
    bottom: 40px;
    right: 30px;
    text-align: right;
    width: 270px;
    p {
      color: #fff;
      font-size: 12px;
      margin-top: 0;
      margin-bottom: 5px;
    }
    p span {
      color: #888;
      margin-right: 10px;
    }
    h4 {
      color: #fff;
    }
  }
}
</style>
