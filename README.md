# vue-d3-graph

基于之前的代码进行修改：[neo4j-d3-graph](https://github.com/CoderWanp/neo4j-d3-graph)

目前只是最基础的版本，主要是提供代码的参考，后续会完善代码内容

## 依赖安装
```
yarn install
```

### 项目启动
```
yarn serve
```

### 项目打包
```
yarn build
```

### 使用lint检查并修复文件
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## 关于新版d3与老版本的差异

### d3.event被移除

- 老版本（v4）

  ```js
  // 事件绑定部分
  d3dom.append('g')
      .attr("class", "texts")
      .selectAll("text")
      .data(nodes)
      .enter()
  	// 省略处理部分，以下是拖拽事件的绑定
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
  ```

  ```js
  // 以drag代码为例，在v6中使用会报错
  // 开始拖动并更新相应的点
  function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
  }
  // 拖动进行中
  function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
  }
  // 拖动结束
  function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
  }
  ```

  报错：`export 'event' (imported as 'd3') was not found in 'd3'`

- 新版本（v6）

  ```js
  function started(event) {
    var circle = d3.select(this).classed("dragging", true);
  
    event.on("drag", dragged).on("end", ended);
  
    function dragged(event, d) {
      circle.raise().attr("cx", d.x = event.x).attr("cy", d.y = event.y);
    }
  
    function ended() {
      circle.classed("dragging", false);
    }
  }
  ```

### vue组件css不生效

原因：添加了scoped，其通过d3动态添加的节点css样式不生效

