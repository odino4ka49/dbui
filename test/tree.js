const InfiniteTree = require('infinite-tree');

// when using webpack and browserify
require('infinite-tree/dist/infinite-tree.css');

const data = {
    id: 'fruit',
    name: 'Fruit',
    children: [{
        id: 'apple',
        name: 'Apple'
    }, {
        id: 'banana',
        name: 'Banana',
        children: [{
            id: 'cherry',
            name: 'Cherry',
            loadOnDemand: true
        }]
    }]
};

const tree = new InfiniteTree({
    el: document.querySelector('#tree'),
    data: data,
    autoOpen: true, // Defaults to false
    droppable: { // Defaults to false
        hoverClass: 'infinite-tree-droppable-hover',
        accept: function(event, options) {
            return true;
        },
        drop: function(event, options) {
        }
    },
    shouldLoadNodes: function(parentNode) {
        if (!parentNode.hasChildren() && parentNode.loadOnDemand) {
            return true;
        }
        return false;
    },
    loadNodes: function(parentNode, next) {
        // Loading...
        const nodes = [];
        nodes.length = 1000;
        for (let i = 0; i < nodes.length; ++i) {
            nodes[i] = {
                id: `${parentNode.id}.${i}`,
                name: `${parentNode.name}.${i}`,
                loadOnDemand: true
            };
        }

        next(null, nodes, function() {
            // Completed
        });
    },
    nodeIdAttr: 'data-id', // the node id attribute
    rowRenderer: function(node, treeOptions) { // Customizable renderer
        return '<div data-id="<node-id>" class="infinite-tree-item">' + node.name + '</div>';
    },
    shouldSelectNode: function(node) { // Determine if the node is selectable
        if (!node || (node === tree.getSelectedNode())) {
            return false; // Prevent from deselecting the current node
        }
        return true;
    }
});