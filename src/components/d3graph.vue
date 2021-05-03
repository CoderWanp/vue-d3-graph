<template>
  <div class="graph">
    <h1>{{ title }}</h1>
    <el-button style="margin-top: 15px;" @click="update">图数据切换，动态更新</el-button>
    <!-- <div style="margin-top: 15px;width: 500px;">
      <el-input placeholder="请输入内容" v-model="input" class="input-with-select">
        <el-select v-model="mode" slot="prepend" placeholder="关键字查询">
          <el-option label="关键字查询" value="1"></el-option>
          <el-option label="单实体查询" value="2"></el-option>
          <el-option label="关联查询" value="3"></el-option>
        </el-select>
        <el-button slot="append" type="success" icon="el-icon-search">搜索</el-button>
      </el-input>
    </div> -->
    <!-- 绘制模式选择 -->
    <div id="mode">
      <h4>文字搜索</h4>
      <div style="margin-bottom: 20px;">
        <span
          @click="changeNodeState(0)"
          :class="{ active: modeSpanActive }"
          style="border-top-right-radius:0;border-bottom-right-radius:0;"
        >显示</span>
        <!-- <span
          @click="changeNodeState(1)"
          :class="{ active: nodeState === 1 }"
          style="border-top-left-radius:0;border-bottom-left-radius:0;position:relative;left:-5px;"
        >关系(度)</span> -->
        <span
          @click="changeNodeState(2)"
          :class="{ active: nodeState === 2 }"
          style="border-top-left-radius:0;border-bottom-left-radius:0;position:relative;left:-5px;"
        >隐藏</span>
      </div>
      <el-input @input="searchKeyWords" v-model="keywords" placeholder="请输入内容" />
      <p style="text-align: left;">
        <strong>节点个数：{{ nodes.length }}</strong>
        <br>
        <strong>关系个数：{{ links.length }}</strong>
        <br>
        <strong>图密度：{{ (links.length / (nodes.length * (nodes.length - 1))).toFixed(3) }}</strong>
        <br>
        <strong>平均度数：{{ (links.length / nodes.length).toFixed(3) }}</strong>
      </p>
    </div>
    <!-- <div
      class="showContainer"
      style="width: 1200px;height: 800px;"
    > -->
      <svg
        id="svg1"
        width="1100"
        height="650"
      ></svg>
    <!-- </div> -->
    <!-- 绘制图例 -->
    <div id="indicator">
      <!-- 利用item 遍历一个数组 利用index 遍历另外一个数组 -->
      <div v-for="(name, index) in names" :key="index">
        <span
          @click="hideNodeOfType"
          :data-state="states[index]"
          :data-index="index"
          style="cursor: pointer;"
          :style="{ backgroundColor: states[index] === 'on' ? colors[index] : '#aaa' }"
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
import * as d3 from 'd3'
import install from '@/plugins/d3-context-menu'
install(d3) // 为d3注册右键菜单插件
// console.log(d3.contextMenu)
export default {
  name: 'd3graph',
  props: {
    title: {
      type: String,
      default: '2D图谱展示'
    }
  },
  data () {
    return {
      input: '',
      // mode: '',
      keywords: '',
      // 节点状态，表示节点显示的文本信息（名称、度）
      nodeState: 0,
      // 根据graph数据的变化，d3render()进行图形渲染
      graph: require('../data/records.json'),
      // d3jsonParser()处理graph后返回的结果
      data: {},
      // d3render()最终展示到页面上的数据（节点隐藏功能）
      nodes: [],
      links: [],
      // 图例的名称、对应的颜色以及图例状态
      names: ['企业', '贸易类型', '地区', '国家'],
      colors: ['#55ffff', '#aaaaff', '#4e88af', '#ca635f'],
      states: ['on', 'on', 'on', 'on'],
      selectNodeData: {}, // 选中节点的详细信息展示
      isNodeClicked: false, // 是否点击（选中）节点
      // 用于位置、大小矫正（暂不使用）
      // svgTranslate: [240, 130],
      // svgScale: 0.5,
      // 右击事件的菜单栏
      menu: [
        {
          title: '隐藏节点',
          action: (elm, d) => {
            console.log(d)
            // 遍历删除节点
            this.nodes = this.nodes.filter(node => {
              if (node.id === d.id) return false
              else return true
            })
            // 遍历删除关系
            this.links = this.links.filter(link => {
              if (link.source.id === d.id || link.target.id === d.id) return false
              else return true
            })
            this.d3render() // 重新渲染图
          },
          disabled: false // optional, defaults to false
        },
        {
          title: '显示节点关联图',
          action: (elm, d) => {
            console.log(d)
            // 遍历保留对应节点
            this.nodes = this.data.nodes.filter(node => {
              if (node.id === d.id) return true
              else {
                for (var i = 0; i < this.links.length; i++) {
                  // 如果links的起点等于name，并且终点等于正在处理的则显示
                  if (this.data.links[i].source.id === node.id && this.data.links[i].target.id === d.id) {
                    return true
                  }
                  if (this.data.links[i].target.id === node.id && this.data.links[i].source.id === d.id) {
                    return true
                  }
                }
                return false
              }
            })
            // 遍历保留节点的关联关系
            this.links = this.data.links.filter(link => {
              if (link.source.id === d.id || link.target.id === d.id) return true
              else return false
            })
            this.d3render() // 重新渲染图
          }
        },
        {
          title: '显示所有查询节点',
          action: (elm, d) => {
            this.nodes = this.data.nodes
            // 遍历保留节点的关联关系
            this.links = this.data.links
            this.d3render() // 重新渲染图
          }
        }
      ]
    }
  },
  computed: {
    modeSpanActive: function () {
      // `this` 指向 vm 实例
      return this.nodeState === 0
    }
  },
  mounted () {
    // console.log(this.$el)
    this.d3init()
  },
  methods: {
    changeNodeState (state) {
      // state发生变化时才进行更新、处理
      if (this.nodeState !== state) {
        this.nodeState = state
        const text = d3.selectAll('.texts text')
        console.log(text)
        // 根据新的节点状态，在节点上展示不同的文本信息
        if (this.nodeState === 2) {
          text.style('display', 'none')
          // 暂不作校准
          // // transform属性数值化
          // // 原：translate(40, 8) scale(1)
          // // 现：[40, 8, 1]
          // let transform = d3.select('#svg1 g').attr('transform')
          // transform = transform
          //   ? transform.match(/\d.?/g).map(item => parseInt(item))
          //   : [0, 0, 1]
          // // 校准
          // transform[0] = transform[0] + this.svgTranslate[0]
          // transform[1] = transform[1] + this.svgTranslate[1]
          // transform[2] = transform[2] * this.svgScale

          // console.log(transform)
          // // 隐藏节点后，svg自动缩放
          // d3.select('#svg1 g').attr('transform', 'translate(' + transform[0] + ', ' + transform[1] + ') scale(' + transform[2] + ')')
        } else {
          text.style('display', 'block')
          // 暂不作校准
          // 显示节点后，svg自动还原
          // d3.select('#svg1 g').attr('transform', '')
        }
      }
    },
    // 隐藏该类型的所有节点
    hideNodeOfType (event) {
      // console.log(event.target.dataset)
      const index = event.target.dataset.index
      const state = event.target.dataset.state
      const nodeTypes = ['Enterprise', 'Type', 'Region', 'Country']
      const linkTypes = ['', 'type', 'locate', 'export']
      // 图例的状态切换（对应类型的节点隐藏）
      if (state === 'on') {
        // 隐藏该类型的所有节点及关联关系
        // this.states[index] = 'off'
        this.$set(this.states, index, 'off')
      } else {
        // this.states[index] = 'on'
        this.$set(this.states, index, 'on')
      }
      /**************************************
       * 状态更新后，同时对数据更新
       */
      const indexs = this.states.map(s => {
        if (s === 'on') {
          return '1'
        } else {
          return '0'
        }
      })
      // 遍历删除节点
      this.nodes = this.data.nodes.filter(node => {
        for (let i = 0; i < indexs.length; i++) {
          if (node.label === nodeTypes[i] && indexs[i] === '0') return false
        }
        return true
      })
      // 遍历删除关系
      this.links = this.data.links.filter(link => {
        for (let i = 0; i < indexs.length; i++) {
          if (i === 0 && indexs[i] === '0') return false
          else if (link.type === linkTypes[i] && indexs[i] === '0') return false
        }
        return true
      })
      // 调试时使用
      // console.log(indexs)
      // console.log(this.data.nodes.length, this.data.links.length)
      // console.log(this.nodes.length)
      // console.log(this.links.length)
      // 重新渲染
      this.d3render()
    },
    // 视图更新
    update () {
      // console.log(this.graph.length)
      if (this.graph.length <= 20) {
        this.graph = require('../data/top5.json')
      } else {
        this.graph = require('../data/records.json')
      }
      this.d3init()
    },
    /*eslint-disable*/
    // 搜索包含关键字的节点
    searchKeyWords (value) {
      console.log('keyup event! => ' + value)
      // 如果Input值是空的显示所有的圆和线(没有进行筛选)
      if (this.keywords === '') {
        // d3.select('#svg1 .texts').selectAll('text').attr('class', '')
        d3.select('#svg1 .nodes').selectAll('circle').attr('class', '')
        d3.select('#svg1 .links').selectAll('line').attr('class', '')
      }
      // 否则判断判断三个元素是否等于name值，等于则显示该值
      else {
        var name = this.keywords
        // 搜索所有的节点
        d3.select('#svg1 .nodes').selectAll('circle').attr('class', (d) => {
          // 输入节点id的小写等于name则显示，否则隐藏
          if (d.properties.name.indexOf(name) >= 0) {
              return 'fixed'
          } else {
            // 优化：与该搜索节点相关联的节点均显示
            // links链接的起始节点进行判断,如果其id等于name则显示这类节点
            // 注意: graph=data
            for (var i = 0; i < this.links.length; i++) {
              // 如果links的起点等于name，并且终点等于正在处理的则显示
              if ((this.links[i]['source'].properties.name.indexOf(name) >= 0) && 
                (this.links[i]['target'].id == d.id)) {
                  return 'active'
              }
              // 如果links的终点等于name，并且起点等于正在处理的则显示
              if ((this.links[i]['target'].properties.name.indexOf(name) >= 0) && 
                (this.links[i]['source'].id == d.id)) {
                  return 'active'
              }
            }
            return 'inactive' // 隐藏
          }
        })
        // 搜索texts
        // d3.select('#svg1 .texts').selectAll('text').attr('class', (d) => {
        //   if (d.properties.name.indexOf(name) >= 0) {
        //       return ''
        //   } else {
        //     // 优化：与该搜索节点相关联的节点均显示
        //     // links链接的起始节点进行判断,如果其id等于name则显示这类节点
        //     for (var i = 0; i < this.links.length; i++) {
        //     // 如果links的起点等于name，并且终点等于正在处理的则显示
        //       if ((this.links[i]['source'].properties.name.indexOf(name) >= 0) && 
        //         (this.links[i]['target'].id == d.id)) {
        //           return ''
        //       }
        //       //如果links的终点等于name，并且起点等于正在处理的则显示
        //       if ((this.links[i]['target'].properties.name.indexOf(name) >= 0) && 
        //         (this.links[i]['source'].id == d.id)) {
        //         return ''
        //       }
        //     }
        //     return 'inactive'
        //   }
        // })
        // 搜索links
        // 显示相的邻边 注意 || 
        d3.select("#svg1 .links").selectAll('line').attr('class', (d) => {
          if ((d.source.properties.name.indexOf(name) >= 0) || 
            (d.target.properties.name.indexOf(name) >= 0) 
            ) {
              return ''
            } else {
              return 'inactive' //隐藏
            }
        })
      }
    },
    // d3初始化，包括数据解析、数据渲染
    d3init () {
      this.d3jsonParser(this.graph)
      this.d3render()
      // 数据初始化
      this.nodeState = 0
      this.states = ['on', 'on', 'on', 'on']
    },
    /*eslint-disable*/
    d3jsonParser (json) {
      const nodes =[]
      const links = [] // 存放节点和关系
      const nodeSet = [] // 存放去重后nodes的id

      // 使用vue直接通过require获取本地json，不再需要使用d3.json获取数据
      // d3.json('./../data/records.json', function (error, data) {
      //   if (error) throw error
      //   graph = data
      //   console.log(graph[0].p)
      // })

      for (let item of json) {
        for (let segment of item.p.segments) {
          // 重新更改data格式
          if (nodeSet.indexOf(segment.start.identity) == -1) {
            nodeSet.push(segment.start.identity)
            nodes.push({
              id: segment.start.identity,
              label: segment.start.labels[0],
              properties: segment.start.properties
            })
          }
          if (nodeSet.indexOf(segment.end.identity) == -1) {
            nodeSet.push(segment.end.identity)
            nodes.push({
              id: segment.end.identity,
              label: segment.end.labels[0],
              properties: segment.end.properties
            })
          }
          links.push({
            source: segment.relationship.start,
            target: segment.relationship.end,
            type: segment.relationship.type,
            properties: segment.relationship.properties
          })
        }
      }
      console.log(nodes)
      console.log(links)
      this.links = links
      this.nodes = nodes
      this.data = { nodes, links }
      // return { nodes, links }
    },
    d3render () {
      var _this = this // 临时获取Vue实例，避免与d3的this指针冲突

      // 渲染前清空svg内的元素
      d3.select("#svg1").selectAll('*').remove()
      // svg.selectAll('g').remove()

      var svg = d3.select("#svg1")
        .on('click', () => { 
          console.log(this.isNodeClicked)
          this.isNodeClicked = false
          // 移除所有样式
          d3.select('#svg1 .nodes').selectAll('circle').attr('class', '')
          d3.select('#svg1 .links').selectAll('line').attr('class', '')
          // d3.select(this).attr('class', '')
          // 如果此时有搜索关键字，则鼠标离开时保留原搜索选中的节点
          if(this.keywords !== '') {
            this.searchKeyWords()
          }
        })
        // 给画布绑定zoom事件（缩放、平移）
        .call(d3.zoom().on('zoom', function(event) {
          // console.log(event)
          var scale = event.transform.k,
              translate = [event.transform.x, event.transform.y]

          // if (this.svgTranslate) {
          //     translate[0] += this.svgTranslate[0]
          //     translate[1] += this.svgTranslate[1]
          // }

          // if (this.svgScale) {
          //     scale *= this.svgScale
          // }

          svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
        }))
        .append('g')
        .attr('width', '100%')
        .attr('height', '100%')
        
      // console.log(svg)
      // 动态变化时，不再固定宽高
			// var width = svg.attr("width"),
      //     height = svg.attr("height")

      // 解析json和数据处理
      // 现在解析json直接在d3jsonParser()中更新nodes和links
      // const data = this.d3jsonParser(this.graph)
      // this.links = data.links.map(d => Object.create(d))
      // this.nodes = data.nodes.map(d => Object.create(d))

      // 定义碰撞检测模型
      var forceCollide = d3.forceCollide()
        .radius(function(d){
          return 16 * 2.2
        })
        .iterations(0.15)
        .strength(0.75)

      // 利用d3.forceSimulation()定义关系图 包括设置边link、排斥电荷charge、关系图中心点
      var simulation = d3.forceSimulation(this.nodes)
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-500))
        // .force("center", d3.forceCenter(width / 2, height / 2)
        .force("center", d3.forceCenter(svg.node().parentElement.clientWidth / 2, svg.node().parentElement.clientHeight / 2))
        .force("collision", forceCollide)
      
      // D3映射数据至HTML中
      // g用于绘制所有边,selectALL选中所有的line,并绑定数据data(graph.links),enter().append("line")添加元素
      // 数据驱动文档,设置边的粗细
      var link = svg.append("g").attr("class","links").selectAll("line").data(this.links).enter()
        .append("line").attr("stroke-width", function(d) {
          // 每次访问links的一项数据
          return 2 //所有线宽度均为2
        })
      
      // 添加所有的点
      // selectAll("circle")选中所有的圆并绑定数据,圆的直径为d.size
      // 再定义圆的填充色,同样数据驱动样式,圆没有描边,圆的名字为d.id
      // call()函数：拖动函数,当拖动开始绑定dragstarted函数，拖动进行和拖动结束也绑定函数
      var node = svg.append("g").attr("class", "nodes").selectAll("circle").data(this.nodes).enter()
        .append("circle").attr("r", function(d) {
          // 每次访问nodes的一项数据
          // console.log(d)
          let size = 16
          switch(d.label){
            case 'Enterprise': break;
            case 'Type': size = 14; break;
            case 'Region': size = 13; break;
            default: size = 13; break;
          }
          return size * 2
        })
        .attr("fill", d => {
          let index = 0
          switch(d.label){
            case 'Enterprise': break;
            case 'Type': index = 1; break;
            case 'Region': index = 2; break;
            default: index = 3; break;
          }
          return this.colors[index]
        })
        .attr("stroke", "none").attr("name", function(d) {
          return d.properties.name
        })
        .attr("id", d => d.id)
        .call(this.drag(simulation))
        .on("click", nodeClick)
        .on('mouseenter', function (event) {
          // console.dir(this)
          const node = d3.select(this)
          // node.attr("class", "fixed")
          // node.classed("fixed", true)
          // console.log(node)
          //获取被选中元素的名字
          let name = node.attr("name")
          let id = node.attr("id")
          let color = node.attr('fill')
          // console.log(name, id, color)
          //设置#info h4样式的颜色为该节点的颜色，文本为该节点name
          _this.$set(_this.selectNodeData, 'id', id)
          _this.$set(_this.selectNodeData, 'name', name)
          _this.$set(_this.selectNodeData, 'color', color)
          
          //遍历查找id对应的属性
          for (let item of _this.nodes) {
            if (item.id == id) {
              // for(var key in item.properties)
              _this.$set(_this.selectNodeData, 'properties', item.properties)
            }
          }
          // 选择#svg1 .nodes中所有的circle，再增加个class
          d3.select('#svg1 .nodes').selectAll('circle').attr('class', function(d) {
            // 节点属性name是否等于name，返回fixed（激活选中样式）
            if(d.properties.name == name) {
              return 'fixed'
            }
            // 当前节点返回空，否则其他节点循环判断是否被隐藏起来(CSS设置隐藏)
            else {
              // links链接的起始节点进行判断,如果其id等于name则显示这类节点
              // 注意: graph = data
              for (var i = 0; i < _this.links.length; i++) {
                //如果links的起点等于name，并且终点等于正在处理的则显示
                if (_this.links[i]['source'].properties.name == name && _this.links[i]['target'].id == d.id) {
                    return 'active'
                }
                if (_this.links[i]['target'].properties.name == name && _this.links[i]['source'].id == d.id) {
                    return 'active'
                }
              }
              return _this.isNodeClicked ? 'inactive' : '' // 前面CSS定义 .nodes circle.inactive
            }
          })
          //处理相邻的边line是否隐藏 注意 || 
          d3.select("#svg1 .links").selectAll('line').attr('class', function(d) {
              if (d.source.properties.name == name || d.target.properties.name == name) {
                  return 'active'
              } else {
                  return _this.isNodeClicked ? 'inactive' : ''
              }
          })
        })
        .on('mouseleave', (event) => {
          console.log(this.isNodeClicked)
          if (!this.isNodeClicked) {
            d3.select('#svg1 .nodes').selectAll('circle').attr('class', '')
            d3.select('#svg1 .links').selectAll('line').attr('class', '')
            // d3.select(this).attr('class', '')
            // 如果此时有搜索关键字，则鼠标离开时保留原搜索选中的节点
            if(this.keywords !== '') {
              this.searchKeyWords()
            }
          }
        })
        .on('contextmenu', d3.contextMenu(this.menu))
        // .on('contextmenu', function (d, i) {
        //   // 阻止默认右键菜单的弹出
        //   d3.event.preventDefault()
          
        // })
        // .call(d3.drag()
        //   .on("start", dragstarted)
        //   .on("drag", dragged)
        //   .on("end", dragended)
        // )
      
      // 显示所有的文本
      // 设置大小、填充颜色、名字、text()设置文本
      // 使用 attr("text-anchor", "middle")设置文本居中
      var text = svg.append("g")
        .attr("class", "texts")
        .selectAll("text")
        .data(this.nodes)
        .enter()
        .append("text").attr("font-size", function(d) {
          return 13
        })
        .attr("fill", function(d) {
          return '#fff'
        })
        .attr('name', function(d) {
            return d.properties.name
        })
        .attr("text-anchor", "middle")
        .attr('x', function (d) {
          return textBreaking(d3.select(this), d.properties.name)
        })
        .call(this.drag(simulation))
        .on("click", nodeClick)
        .on('mouseenter', function (event) {
          // console.dir(this)
          const text = d3.select(this)
          // console.log(text)
          // 获取被选中元素的名字
          let name = text.attr("name")
          _this.$set(_this.selectNodeData, 'name', name)
          
          // 根据文本名称获取节点的id
          for (let item of _this.nodes) {
            if (item.properties.name == name) {
              // 设置节点id和标签属性
              _this.$set(_this.selectNodeData, 'id', item.id)
              _this.$set(_this.selectNodeData, 'properties', item.properties)
              // 根据节点类型label获取节点颜色
              let index = 0
              switch (item.label) {
                case 'Enterprise': break;
                case 'Type': index = 1;break;
                case 'Region': index = 2;break;
                default: index = 3;break;
              }
              _this.$set(_this.selectNodeData, 'color', _this.colors[index])
            }
          }
          // 选择#svg1 .nodes中所有的circle，再增加个class
          d3.select('#svg1 .nodes').selectAll('circle').attr('class', function(d) {
            // 数据的id是否等于name,返回空
            if(d.properties.name == name) {
              return 'fixed'
            } 
            // 当前节点返回空，否则其他节点循环判断是否被隐藏起来(CSS设置隐藏)
            else {
              // links链接的起始节点进行判断,如果其id等于name则显示这类节点
              // 注意: graph=data
              for (var i = 0; i < _this.links.length; i++) {
                // 如果links的起点等于name，并且终点等于正在处理的则显示
                if (_this.links[i]['source'].properties.name == name && _this.links[i]['target'].id == d.id) {
                    return 'active'
                }
                if (_this.links[i]['target'].properties.name == name && _this.links[i]['source'].id == d.id) {
                    return 'active'
                }
              }
              return _this.isNodeClicked ? 'inactive' : '' //前面CSS定义 .nodes circle.inactive
            }
          })
          //处理相邻的边line是否隐藏 注意 || 
          d3.select("#svg1 .links").selectAll('line').attr('class', function(d) {
              if (d.source.properties.name == name || d.target.properties.name == name) {
                  return 'active'
              } else {
                  return _this.isNodeClicked ? 'inactive' : ''
              }
          })
        })
        .on('mouseleave', (event) => {
          if(!this.isNodeClicked) {
            d3.select('#svg1 .nodes').selectAll('circle').attr('class', '')
            d3.select('#svg1 .links').selectAll('line').attr('class', '')
            // d3.select(this).attr('class', '')
            // 如果此时有搜索关键字，则鼠标离开时保留原搜索选中的节点
            if(this.keywords !== '') {
              this.searchKeyWords()
            }
          }
        })
        .on('contextmenu', d3.contextMenu(this.menu))
        // .call(d3.drag()
        //   .on("start", dragstarted)
        //   .on("drag", dragged)
        //   .on("end", dragended)
        // )
          
      // 圆增加title
      node.append("title").text(d => d.properties.name)
      
      // simulation中ticked数据初始化并生成图形
      simulation.on("tick", ticked)
        
      simulation.force("link")
        .links(this.links)
        .distance(d => { // 每一边的长度
          let distance = 10
          switch(d.source.label) {
            case 'Enterprise': distance += 30;break;
            case 'Type': distance += 25;break;
            case 'Region': distance += 22;break;
            default: distance += 20;break; 
          }
          switch(d.target.label) {
            case 'Enterprise': distance += 30;break;
            case 'Type': distance += 25;break;
            case 'Region': distance += 22;break;
            default: distance += 20;break; 
          }
          return distance * 1.2
        })
      
      /****************************************** 
       * 内部功能函数
       * 包括：拖动、
       */
      // ticked()函数确定link线的起始点x、y坐标 node确定中心点 文本通过translate平移变化
      function ticked() {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y)
    
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y)
    
        text.attr('transform', function(d) {
          let size = 15
          switch(d.label){
            case 'Enterprise': break;
            case 'Type': size = 14;break;
            case 'Region': size = 13;break;
            default: size = 12;break;
          }
          size -= 5
          return 'translate(' + (d.x - size / 2 + 3) + ',' + (d.y + size / 2) + ')'
        })
      }
      
      /**
       * 文本分隔（根据字数在当前选择器中分隔三行，超过10字省略）
       * @method textBreaking
       * @param {d3text} 文本对应的DOM对象
       * @param {text} 节点名称的文本值
       * @return {void}
       */
      function textBreaking(d3text, text) {
        const len = text.length
        if (len <= 3) {
          d3text.append('tspan')
            .attr('x', 0)
            .attr('y', 2)
            .text(text)
        } else {
          const topText = text.substring(0, 3)
          const midText = text.substring(3, 7)
          let botText = text.substring(7, len)
          let topY = -16
          let midY = 0
          let botY = 16
          if (len <= 7) {
            topY += 10
            midY += 10
          } else if (len > 10){
            botText = text.substring(7, 9) + '...'
          }
  
          d3text.text('')
          d3text.append('tspan')
            .attr('x', 0)
            .attr('y', topY)
            .text(function () {
              return topText
            })
          d3text.append('tspan')
            .attr('x', 0)
            .attr('y', midY)
            .text(function () {
              return midText
            })
          d3text.append('tspan')
            .attr('x', 0)
            .attr('y', botY)
            .text(function () {
              return botText
            })
        }
      }
      // 分别定义节点和文本的点击事件
      // 优化：由于点击前必定触发mouseenter事件，所以不用再去查找节点id
      //      直接根据this.selectNodeData拿到节点信息
      // 优化后：只需定义一个点击事件即可
      function nodeClick(event, d) {
        // console.log('node clicked!')
        // sticked用于固定节点（无法实现节点固定功能）
        // delete d.fx
        // delete d.fy
        // d3.select(this).classed("fixed", true)
        // simulation.alpha(1).restart()

        // 获取被选中元素信息
        // const node = d3.select(this)
        // let name = node.attr("name")
        // let id = node.attr("id")
        // let color = node.attr('fill')
        // console.log(name, id, color)

        // 直接通过this.selectNodeData拿到节点信息
        event.cancelBubble = true
        event.stopPropagation() // 阻止事件冒泡
        const name = _this.selectNodeData.name
        _this.isNodeClicked = true
        console.log(_this.isNodeClicked)
        // 选择#svg1 .nodes中所有的circle，再增加个class
        d3.select('#svg1 .nodes').selectAll('circle').attr('class', function(d) {
          // 节点属性name是否等于name，返回fixed（激活选中样式）
          if(d.properties.name == name) {
            return 'fixed'
          }
          // 当前节点返回空，否则其他节点循环判断是否被隐藏起来(CSS设置隐藏)
          else {
            // links链接的起始节点进行判断,如果其id等于name则显示这类节点
            // 注意: graph = data
            for (var i = 0; i < _this.links.length; i++) {
              //如果links的起点等于name，并且终点等于正在处理的则显示
              if (_this.links[i]['source'].properties.name == name && _this.links[i]['target'].id == d.id) {
                  return 'active'
              }
              if (_this.links[i]['target'].properties.name == name && _this.links[i]['source'].id == d.id) {
                  return 'active'
              }
            }
            return 'inactive'
          }
        })
        //处理相邻的边line是否隐藏 注意 || 
        d3.select("#svg1 .links").selectAll('line').attr('class', function(d) {
            if (d.source.properties.name == name || d.target.properties.name == name) {
                return 'active'
            } else {
                return 'inactive'
            }
        })

        return false
      }
      function textClick (event, d) {
        // const text = d3.select(this)
        // console.log(text)
        // // 获取被选中元素的名字
        // let name = text.attr("name")
        // 根据文本遍历节点数组，查找对应的id
        // （参考text的mouseenter事件）

        // 直接通过this.selectNodeData拿到节点信息
        console.log(_this.selectNodeData)
      }
    },
    drag(simulation) {
      function dragsubject(event) {
        return simulation.find(event.x, event.y);
      }

      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        // 注释以下代码，使拖动结束后固定节点
        // event.subject.fx = null;
        // event.subject.fy = null;
      }
      
      return d3.drag()
        .subject(dragsubject)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .el-select {
    width: 120px;
    // background-color: #fff;
  }
  .input-with-select .el-input-group__prepend {
    background-color: #6ecbf3;
  }
</style>
<style lang="scss">
@import '@/plugins/d3-context-menu';
$opacity: 0.1;  /* 显示的不透明度 */
.graph {
  position: relative;
  border: 2px #000 solid;
  background-color: #9dadc1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
h1 {
  color: #000;
  font-size: 32px;
  margin-bottom: 0px;
  text-align: center;
  // margin-left: 40px;
}
svg {
  margin: 20px 0px;
  border: 1px #000 solid;
}
/*设置节点及边的样式*/
.links line {
  stroke: #bbb;
  stroke-opacity: 1;
  &.inactive {
    /* display: none !important; */
    opacity: $opacity;
  }
  &.active {
    stroke: rgb(58, 93, 126);
  }
  &.hide {
    display: none !important;
  }
}
.nodes circle {
  // stroke: #000;
  // stroke-width: 1.5px;
  &.fixed {
    // fill: rgb(102, 81, 81);
    stroke: #888;
    stroke-width: 9px;
  }
  &.inactive {
    /* display: none !important; */
    opacity: $opacity;
  }
  &.active {
    stroke: rgb(58, 93, 126);
    stroke-width: 4px;
  }
  &:hover {
    cursor: pointer;
  }
  &.hide {
    display: none !important;
  }
}
.texts text {
  cursor: pointer;
  text-decoration: none;
  user-select: none;
  &:hover {
    cursor: pointer;
  }
  &.inactive {
    /* display: none !important; */
    opacity: $opacity;
  }
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
/*mode选项样式*/
#mode {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
		top: 200px;
    left: 40px;
    span {
        display: inline-block;
        border: 1px solid #fff;
        color: #fff;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 14px;
        transition: color, background-color .3s;
        -o-transition: color, background-color .3s;
        -ms-transition: color, background-color .3s;
        -moz-transition: color, background-color .3s;
        -webkit-transition: color, background-color .3s;
    }
    span.active, span:hover {
        background-color: #fff;
        color: #333;
        cursor: pointer;
    }
}
/*悬浮节点的info样式*/
#info {
		position: absolute;
		bottom: 40px;
		right: 30px;
		text-align: right;
		width: 270px;
}
#info p {
		color: #fff;
		font-size: 12px;
		margin-top: 0;
		margin-bottom: 5px;
}
#info p span {
		color: #888;
		margin-right: 10px;
}
#info h4 {
		color: #fff;
}
</style>
