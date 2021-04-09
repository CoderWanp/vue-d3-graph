let _d3 = null
// 为d3注册该右键菜单插件
function install (d3) {
  _d3 = d3
  _d3.contextMenu = contextMenu
}
const contextMenu = function (menu, openCallback) {
  // create the div element that will hold the context menu
  _d3.selectAll('.d3-context-menu').data([1])
    .enter()
    .append('div')
    .attr('class', 'd3-context-menu')

  // close menu
  _d3.select('body').on('click.d3-context-menu', function () {
    _d3.select('.d3-context-menu').style('display', 'none')
  })

  // this gets executed when a contextmenu event occurs
  return function (event, data) {
    console.log(event)
    // 指向右键触发的节点
    var elm = this

    _d3.selectAll('.d3-context-menu').html('')
    var list = _d3.selectAll('.d3-context-menu').append('ul')
    list.selectAll('li').data(menu).enter()
      .append('li')
      .html(function (d) {
        return d.title
      })
      .on('click', function (e, d) {
        // console.log(d)
        d.action(elm, data)
        _d3.select('.d3-context-menu').style('display', 'none')
      })

    // the openCallback allows an action to fire before the menu is displayed
    // an example usage would be closing a tooltip
    if (openCallback) openCallback(data)

    // display context menu
    _d3.select('.d3-context-menu')
      .style('left', (event.pageX - 2) + 'px')
      .style('top', (event.pageY - 2) + 'px')
      .style('display', 'block')

    event.preventDefault()
  }
}

export default install
