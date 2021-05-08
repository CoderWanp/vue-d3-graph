<template>
  <div>
    <!-- 绘制模式选择 -->
    <div id="mode">
      <h3>文字搜索</h3>
      <div class="gState" style="margin-bottom: 20px;">
        <span
          @click="changeTextState(0)"
          :class="{ active: isShowText }"
          style="border-top-right-radius:0;border-bottom-right-radius:0;"
        >显示</span>
        <!-- <span
          @click="changeNodeState(1)"
          :class="{ active: nodeState === 1 }"
          style="border-top-left-radius:0;border-bottom-left-radius:0;position:relative;left:-5px;"
        >关系(度)</span> -->
        <span
          @click="changeTextState(2)"
          :class="{ active: textState === 2 }"
          style="border-top-left-radius:0;border-bottom-left-radius:0;position:relative;left:-5px;"
        >隐藏</span>
      </div>
      <el-input @input="searchKeyWords" v-model="keywords" clearable placeholder="请输入内容" />
      <p class="font-sky" style="text-align: left;">
        <strong>节点个数：{{ nodes.length }}</strong>
        <br>
        <strong>关系个数：{{ links.length }}</strong>
        <br>
        <strong>平均度数：{{ gDegree }}</strong>
        <br>
        <strong>图密度：{{ gDensity }}</strong>
        <br>
        <strong>稀疏度：{{ gSparsity }}</strong>
      </p>
    </div>
    <svg
      id="svg"
      width="1200"
      height="750"
    ></svg>
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
      <!-- <h4 :style="{ color: selectNodeData.color }">{{ selectNodeData.name }}</h4>
      <p v-for="(item, key) in selectNodeData.properties" :key="item">
        <span>{{ key }}</span>
        {{ item }}
      </p> -->
      <el-card
        :style="{ backgroundColor: selectNodeData.color }"
        class="node-card"
      >
        <div slot="header" class="clearfix">
          <span>{{ selectNodeData.name }}</span>
          <el-button
            @click="btnEdit"
            style="float: right; padding: 3px 0;color: #409EFB;font-size: 15px;"
            type="text"
          >编辑</el-button>
        </div>
        <div
          v-for="(item, key) in selectNodeData.properties" :key="item"
        >
          <span style="margin-right: 8px;">{{ (nodeObjMap[key] ? nodeObjMap[key] : key) + ':' }}</span>
          <span style="text-align: right;"><b>{{ item }}</b></span>
        </div>
      </el-card>
    </div>
    <!-- 编辑框 -->
    <el-dialog :visible.sync="dialogFormVisible">
      <el-form
        :model="temp"
        label-position="right"
        label-width="86px"
        style="width: 500px; margin-left:50px;"
      >
        <el-form-item
          v-for="(value, key) in temp"
          :key="key"
          :label="nodeObjMap[key] ? nodeObjMap[key] : key"
        >
          <el-input
            v-model="temp[key]"
            :readonly="!isEdit"
          />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="cancelEdit">
          取消
        </el-button>
        <el-button type="primary" @click="doEdit">
          确定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import * as d3 from 'd3'
import install from '@/plugins/d3-context-menu'
install(d3) // 为d3注册右键菜单插件
export default {
  name: 'd3graph',
  props: {
    data: {
      type: Object,
      default: function () {
        return {
          nodes: [],
          links: []
        }
      }
    },
    /* eslint-disable */
    // 自定义图例（数组保证一一对应）
    // names		图例名称变量制作图标
    // labels		节点的标签名称（与records.json中保证相同）
    names: {
      type: Array
    },
    labels: Array,
    linkTypes: Array
  },
  data () {
    return {
      svgDom: null, // svg的DOM元素 => d3.select('#svg1')
      keywords: '',
      nodeState: 0,
      // 文本状态，表示是否显示文本信息（0：显示/1：不显示）
      textState: 0,
      // d3render()最终展示到页面上的数据（节点隐藏功能）
      nodes: [],
      links: [],
      /* eslint-disable */
      // 自定义图例及颜色（数组保证一一对应）
      // colors		图例颜色（9个颜色）
      // states   图例状态（on：显示 / off：不显示）
      colors: ['#55cccc', '#aaaaff', '#4e88af', '#ca635f','#FFC0CB', '#BA55D3', '#1E90FF', '#7FFFD4','#FFFF00'],
      states: [],
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
            this.stateInit()
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
                for (var i = 0; i < this.data.links.length; i++) {
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
            this.stateInit()
          }
        },
        {
          title: '显示所有查询节点',
          action: (elm, d) => {
            this.nodes = this.data.nodes
            // 遍历保留节点的关联关系
            this.links = this.data.links
            this.d3render() // 重新渲染图
            this.stateInit()
          }
        }
      ],
      temp: {}, // 临时存储编辑时的节点信息
      dialogFormVisible: false,
      isEdit: true,
      // 节点属性对应的标签名称
      nodeObjMap: {
        'address': '注册地址',
        'captial': '注册资本',
        'credit_code': '信用代码',
        'name': '节点名称',
        'setup_time': '注册日期'
      }
    }
  },
  computed: {
    isShowNode: function () {
      // `this` 指向 vm 实例
      return this.nodeState === 0
    },
    isShowText: function () {
      // `this` 指向 vm 实例
      return this.textState === 0
    },
    gDensity () {
      return this.nodes.length <= 1 ? 0 : (this.links.length / (this.nodes.length * (this.nodes.length - 1))).toFixed(2)
    },
    gDegree () {
      return (this.links.length / this.nodes.length).toFixed(2)
    },
    // 企业实体的平均度数
    gMainDegree () {
      // 遍历节点
      // this.nodes.forEach(node => {
      //   
      // })
      // // 遍历关系
      // this.links.forEach(link => {
      //   
      // })
    },
    // 稀疏度
    gSparsity () {
      return (this.links.length / (this.nodes.length * Math.log(this.nodes.length))).toFixed(2)
    }
  },
  watch: {
    // 当请求到新的数据时，重新渲染
    data (newData, oldData) {
      console.log(newData, oldData)
      // 移除svg和元素注册事件，防止内存泄漏
      this.svgDom.on('.', null)
      this.svgDom.selectAll('*').on('.', null)
      this.d3init()
    }
  },
  created () {
    // this.states = Array(this.names.length).fill('on')
  },
  mounted () {
    this.d3init()
  },
  beforeDestroy () {
    // 移除svg和元素注册事件，防止内存泄漏
    this.svgDom.on('.', null)
    this.svgDom.selectAll('*').on('.', null)
  },
  methods: {
    // 编辑当前选中节点
    btnEdit () {
      this.temp = Object.assign({}, this.selectNodeData.properties) // copy obj
      this.dialogFormVisible = true
      console.log(this.selectNodeData)
    },
    doEdit () {
      // console.log(this.data)
      let i = 0
      // 更新props的data 和 selectNodeData
      this.selectNodeData.name = this.temp.name
      this.selectNodeData.properties = this.temp
      for (let node of this.data.nodes) {
        // console.log(node.id === this.selectNodeData.id)
        // console.log(node.id)
        // console.log(this.selectNodeData.id)
        if (node.id == this.selectNodeData.id) {
          // this.$set(this.data.nodes, i, this.selectNodeData)
          // this.$set(this.nodes, i, this.selectNodeData)
          this.data.nodes[i].properties = this.temp
          this.nodes[i].properties = this.temp
          break
        }
        i++
      }
      this.dialogFormVisible = false
      this.d3init()
      this.$message({
        message: '更新成功',
        type: 'success'
      })
    },
    cancelEdit () {
      this.dialogFormVisible = false
    },
    // 隐藏文字
    changeTextState (state) {
      // state发生变化时才进行更新、处理
      if (this.textState !== state) {
        this.textState = state
        // const text = d3.selectAll('.texts text')
        const text = d3.selectAll('.linkTexts text')
        console.log(text)
        // 根据新的节点状态，在节点上展示不同的文本信息
        if (this.textState === 2) {
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
    // 隐藏该类型的所有节点（图例）
    hideNodeOfType (event) {
      if (this.nodes.length === this.data.nodes.length 
        || this.states.some((state) => state === 'off')) {
        // console.log(event.target.dataset)
        const index = event.target.dataset.index
        const state = event.target.dataset.state
        // const nodeTypes = ['Enterprise', 'Type', 'Region', 'Country']
        // const linkTypes = ['', 'type', 'locate', 'export']
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
            if (node.label === this.labels[i] && indexs[i] === '0') return false
          }
          return true
        })
        // 遍历删除关系
        this.links = this.data.links.filter(link => {
          for (let i = 0; i < indexs.length; i++) {
            if (i === 0 && indexs[i] === '0') return false
            else if (link.type === this.linkTypes[i] && indexs[i] === '0') return false
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
      } else {
        this.$message.error('展示全部节点时才能隐藏图例')
      }
    },
    /*eslint-disable*/
    // 搜索包含关键字的节点
    searchKeyWords (value) {
      // 如果Input值是空的显示所有的圆和线(没有进行筛选)
      if (this.keywords === '') {
        this.clearGraphStyle()
      }
      // 否则判断判断三个元素是否等于name值，等于则显示该值
      else {
        var name = this.keywords
        // 搜索所有的节点
        this.svgDom.select('.nodes').selectAll('circle').attr('class', d => {
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
        this.svgDom.select('.texts').selectAll('text').attr('class', d => {
          if (d.properties.name.indexOf(name) >= 0) {
              return ''
          } else {
            // 优化：与该搜索节点相关联的节点均显示
            // links链接的起始节点进行判断,如果其id等于name则显示这类节点
            for (var i = 0; i < this.links.length; i++) {
            // 如果links的起点等于name，并且终点等于正在处理的则显示
              if ((this.links[i]['source'].properties.name.indexOf(name) >= 0) && 
                (this.links[i]['target'].id == d.id)) {
                  return ''
              }
              //如果links的终点等于name，并且起点等于正在处理的则显示
              if ((this.links[i]['target'].properties.name.indexOf(name) >= 0) && 
                (this.links[i]['source'].id == d.id)) {
                return ''
              }
            }
            return 'inactive'
          }
        })
        // 搜索links
        // 显示相的邻边 注意 || 
        this.svgDom.select(".links").selectAll('line').attr('class', d => {
          if ((d.source.properties.name.indexOf(name) >= 0) || 
            (d.target.properties.name.indexOf(name) >= 0) 
            ) {
              return ''
            } else {
              return 'inactive' //隐藏
            }
        })
        // 搜索linkTexts
        this.svgDom.select(".linkTexts").selectAll('text').attr('class', d => {
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
      this.links = this.data.links
      this.nodes = this.data.nodes
      this.svgDom = d3.select('#svg')  // 获取svg的DOM元素
      // this.d3jsonParser(this.graph)
      this.d3render()
      // 数据状态初始化
      this.stateInit()
    },
    // 数据状态初始化
    stateInit () {
      this.nodeState = 0
      this.textState = 0
      // console.log(this.names)
      this.states = Array(this.names.length).fill('on')
    },
    d3render () {
      var _this = this // 临时获取Vue实例，避免与d3的this指针冲突

      // 渲染前清空svg内的元素
      _this.svgDom.selectAll('*').remove()
      // svg.selectAll('g').remove()

      var svg = _this.svgDom
        .on('click', () => { 
          // console.log(this.isNodeClicked)
          this.isNodeClicked = false
          // 移除所有样式
          this.clearGraphStyle()
          // 如果此时有搜索关键字，则鼠标离开时保留原搜索选中的节点
          if(this.keywords !== '') {
            this.searchKeyWords()
          }
        })
        // 给画布绑定zoom事件（缩放、平移）
        .call(d3.zoom().on('zoom', event => {
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
        
      this.addMarkers()
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
        .radius(d => { return 16 * 3 })
        .iterations(0.15)
        .strength(0.75)

      // 利用d3.forceSimulation()定义关系图 包括设置边link、排斥电荷charge、关系图中心点
      var simulation = d3.forceSimulation(this.nodes)
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-100))
        // .force("center", d3.forceCenter(width / 2, height / 2)
        .force("center", d3.forceCenter(svg.node().parentElement.clientWidth / 2, svg.node().parentElement.clientHeight / 2))
        .force("collision", forceCollide)
      
      // D3映射数据至HTML中
      // g用于绘制所有边,selectALL选中所有的line,并绑定数据data(graph.links),enter().append("line")添加元素
      // 数据驱动文档,设置边的粗细
      var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(this.links).enter()
        .append("line")
        .attr("stroke-width", function(d) {
          // 每次访问links的一项数据
          return 2 //所有线宽度均为2
        })
        .join("path")
        .attr("marker-end", "url(#posMarker)")
      
      var linksName = svg.append("g")
        .attr("class", "linkTexts")
        .selectAll("text")
        .data(this.links)
        .join("text")
        .style('text-anchor','middle')
        .style('fill', '#fff')
        .style('font-size', '12px')
        // .style('font-weight', 'bold')
        .text(d => d.properties.name)

      // linksName
      //   .append('textPath')
      //   .attr('xlink:href', d => '#')
      //   .attr('startOffset', '50%')
        
      // 添加所有的点
      // selectAll("circle")选中所有的圆并绑定数据,圆的直径为d.size
      // 再定义圆的填充色,同样数据驱动样式,圆没有描边,圆的名字为d.id
      // call()函数：拖动函数,当拖动开始绑定dragstarted函数，拖动进行和拖动结束也绑定函数
      var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(this.nodes).enter()
        .append("circle").attr("r", function(d) {
          // 每次访问nodes的一项数据
          // console.log(d)
          let size = 16
          switch(d.label){
            case _this.labels[0]: break;
            case _this.labels[1]: size = 14; break;
            case _this.labels[2]: size = 13; break;
            default: size = 13; break;
          }
          return size * 2
        })
        .attr("fill", d => {
          for (let i = 0;i < this.labels.length;i++) {
            if (d.label === this.labels[i]) return this.colors[i]
          }
        })
        .attr("stroke", "none")
        .attr("name", d => d.properties.name)
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
          // 遍历节点，并调整图的样式
          _this.changeGraphStyle(name)
        })
        .on('mouseleave', event => {
          console.log(this.isNodeClicked)
          if (!this.isNodeClicked) {
            this.clearGraphStyle()
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
        .append("text").attr("font-size", () => 13)
        .attr("fill", () => '#fff')
        .attr('name', d => d.properties.name)
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
                case _this.labels[0]: break;
                case _this.labels[1]: index = 1;break;
                case _this.labels[2]: index = 2;break;
                default: index = 3;break;
              }
              _this.$set(_this.selectNodeData, 'color', _this.colors[index])
            }
          }
          _this.changeGraphStyle(name)
        })
        .on('mouseleave', (event) => {
          if(!this.isNodeClicked) {
            this.clearGraphStyle()
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
          let distance = 20
          switch(d.source.label) {
            case _this.labels[0]: distance += 30;break;
            case _this.labels[1]: distance += 25;break;
            case _this.labels[2]: distance += 22;break;
            default: distance += 20;break; 
          }
          switch(d.target.label) {
            case _this.labels[0]: distance += 30;break;
            case _this.labels[1]: distance += 25;break;
            case _this.labels[2]: distance += 22;break;
            default: distance += 20;break; 
          }
          return distance * 2
        })
      
      /****************************************** 
       * 内部功能函数
       * 包括：ticked、文本分隔、节点和文本的点击事件
       */
      // ticked()函数确定link线的起始点x、y坐标 node确定中心点 文本通过translate平移变化
      function ticked() {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y)
    
        linksName
          .attr('transform', d => {
            let x = Math.min(d.source.x, d.target.x) + Math.abs(d.source.x - d.target.x) / 2
            let y = Math.min(d.source.y, d.target.y) + Math.abs(d.source.y - d.target.y) / 2 - 1
            // tanA = a / b
            // A = arctan(tanA)
            let tanA = Math.abs(d.source.y - d.target.y) / Math.abs(d.source.x - d.target.x)
            let angle = Math.atan(tanA) / Math.PI * 180
            // let angle = Math.atan2(1,1)/Math.PI*180
            // console.log(angle)
            // 第一、二象限额外处理
            if (d.source.x > d.target.x) {
              // 第二象限
              if (d.source.y <= d.target.y) {
                angle = -angle
              }
              // else {  // 第三象限
              //   angle = angle
              // }
            } else if (d.source.y > d.target.y) {
              // 第一象限
              angle = -angle
            }
            return 'translate(' + x + ',' + y + ')' + 'rotate(' + angle + ')'
          })

        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y)
    
        text.attr('transform', function(d) {
          let size = 15
          switch(d.label){
            case _this.labels[0]: break;
            case _this.labels[1]: size = 14;break;
            case _this.labels[2]: size = 13;break;
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
        _this.changeGraphStyle(name)

        return false
      }
    },
    // 根据当前节点名称来更改图样式
    changeGraphStyle (name) {
      // console.log(this.isNodeClicked)
      // 选择#svg1 .nodes中所有的circle，再增加个class
      this.svgDom.select('.nodes').selectAll('circle').attr('class', d => {
        // 节点属性name是否等于name，返回fixed（激活选中样式）
        if(d.properties.name == name) {
          return 'fixed'
        }
        // 当前节点返回空，否则其他节点循环判断是否被隐藏起来(CSS设置隐藏)
        else {
          // links链接的起始节点进行判断,如果其id等于name则显示这类节点
          // 注意: graph = data
          for (var i = 0; i < this.links.length; i++) {
            // 如果links的起点等于name，并且终点等于正在处理的则显示
            if (this.links[i]['source'].properties.name == name && this.links[i]['target'].id == d.id) {
                return 'active'
            }
            if (this.links[i]['target'].properties.name == name && this.links[i]['source'].id == d.id) {
                return 'active'
            }
          }
          return this.isNodeClicked ? 'inactive' : ''
        }
      })
      // 处理相邻的文字是否隐藏
      this.svgDom.select('.texts').selectAll('text')
        .attr('class', d => {
          // 节点属性name是否等于name，返回fixed（激活选中样式）
          if(d.properties.name == name) {
            return ''
          }
          // 当前节点返回空，否则其他节点循环判断是否被隐藏起来(CSS设置隐藏)
          else {
            // links链接的起始节点进行判断,如果其id等于name则显示这类节点
            // 注意: graph = data
            for (var i = 0; i < this.links.length; i++) {
              // 如果links的起点等于name，并且终点等于正在处理的则显示
              if (this.links[i]['source'].properties.name == name && this.links[i]['target'].id == d.id) {
                  return ''
              }
              if (this.links[i]['target'].properties.name == name && this.links[i]['source'].id == d.id) {
                  return ''
              }
            }
            return this.isNodeClicked ? 'inactive' : ''
          }
        })
      // 处理相邻的边line是否隐藏 注意 || 
      this.svgDom.select(".links").selectAll('line')
        .attr('class', d => {
          if (d.source.properties.name == name || d.target.properties.name == name) {
              return 'active'
          } else {
              return this.isNodeClicked ? 'inactive' : ''
          }
        })
        .attr('marker-end', d => {
          if (d.source.properties.name == name || d.target.properties.name == name) {
            return 'url(#posActMarker)'
          } else {
            return 'url(#posMarker)'
          }
        })
      // 处理相邻的边上文字是否隐藏 注意 || 
      this.svgDom.select(".linkTexts").selectAll('text')
        .attr('class', d => {
          if (d.source.properties.name == name || d.target.properties.name == name) {
              return 'active'
          } else {
              return this.isNodeClicked ? 'inactive' : ''
          }
        })
    },
    clearGraphStyle () {
      // 移除所有样式
      this.svgDom.select('.nodes').selectAll('circle').attr('class', '')
      this.svgDom.select(".texts").selectAll('text').attr('class', '')
      this.svgDom.select('.links').selectAll('line').attr('class', '').attr('marker-end', 'url(#posMarker)')
      this.svgDom.select(".linkTexts").selectAll('text').attr('class', '')
      // d3.select(this).attr('class', '')
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
    },
    // 绘制关系箭头
    addMarkers() {
      // 定义箭头的标识
      var defs = this.svgDom.append("defs")
      const posMarker = defs.append("marker")
        .attr("id", "posMarker")
        .attr("orient", "auto")
        .attr("stroke-width", 2)
        .attr("markerUnits", "strokeWidth")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 31)
        .attr("refY", 0)
        .attr("markerWidth", 12)
        .attr("markerHeight", 12)
        .append("path")
        .attr("d", "M 0 -5 L 10 0 L 0 5")
        .attr('fill', '#e0cac1')
        .attr("stroke-opacity", 0.6);
      const posActMarker = defs.append("marker")
        .attr("id", "posActMarker")
        .attr("orient", "auto")
        .attr("stroke-width", 2)
        .attr("markerUnits", "strokeWidth")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 31)
        .attr("refY", 0)
        .attr("markerWidth", 12)
        .attr("markerHeight", 12)
        .append("path")
        .attr("d", "M 0 -5 L 10 0 L 0 5")
        .attr('fill', '#1E90FF')
        .attr("stroke-opacity", 0.6);
      // const negMarker = defs.append("marker")
      //   .attr("id","negMarker")
      //   .attr("orient","auto")
      //   .attr("stroke-width",2)
      //   .attr("markerUnits", "strokeWidth")
      //   .attr("markerUnits", "userSpaceOnUse")
      //   .attr("viewBox", "0 -5 10 10")
      //   .attr("refX", -25)
      //   .attr("refY", 0)
      //   .attr("markerWidth", 12)
      //   .attr("markerHeight", 12)
      //   .append("path")
      //   .attr("d", "M 10 -5 L 0 0 L 10 5")
      //   .attr('fill', '#999')
      //   .attr("stroke-opacity", 0.6);
    }
  }
}
</script>

<style lang="scss">
@import '@/plugins/d3-context-menu';
$opacity: 0.15;  /* 显示的不透明度 */
$activeColor: #1E90FF;  /* 激活的颜色 */
svg {
  margin: 20px 0px;
  // border: 1px #000 solid;
}
/*设置节点及边的样式*/
.links line {
  stroke: #e0cac1b2; // #bbb
  stroke-opacity: 1;
  &.inactive {
    /* display: none !important; */
    opacity: $opacity;
  }
  &.active {
    stroke: $activeColor;
    stroke-width: 3px;
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
    stroke: #FFC0CB;  // #888;
    stroke-width: 14px;
    stroke-opacity: $opacity + 0.3;
    border: 10px #000 solid;
  }
  &.inactive {
    /* display: none !important; */
    opacity: $opacity;
  }
  &.active {
    stroke: $activeColor;
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
.linkTexts text {
  stroke: #ecddd8b2; // #bbb
  stroke-opacity: 1;
  &.active {
    stroke: $activeColor;
  }
  &.inactive {
    /* display: none !important; */
    opacity: $opacity;
  }
}
// #positiveMarker path {
//   fill: #fff;
// }
</style>
<style lang="scss" scoped>
@media only screen and (max-width: 1125px){
  #info, #mode {
    display: none !important;
  }
}
.font-sky {
  font-size: 18px;
  color: #034c6a !important;
}
#indicator {
  position: absolute;
  // left: 50px;
  // bottom: 30px;
  left: 3vw;
  bottom: 2vw;
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
  .gState span {
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
    ~ .active, ~ :hover {
      background-color: #fff;
      color: #333;
      cursor: pointer;
    }
  }
  .gState span.active, .gState span:hover {
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
  width: 270px;
  .node-card {
    border: 1px solid #9faecf;
    background-color: #00aeff6b;
    color: #fff;
    text-align: left;
    // transition: background-color;
    // transition-delay: .3s;
    // transition-timing-function: ease;
    .el-card__header {
      border-bottom: 1px solid #50596d;
    }
  }
}
</style>
