class Vue {
  constructor(options) {
    this.$options = options;
    this.$data = options.data;
    this.methods = options.methods;

    observe(this.$data);
    proxy(this);

    new Compiler(this, this.$options.el);
  }
}

// 监听响应数据
class Observer {
  constructor(obj) {
    this.walk(obj);
  }

  walk(obj) {
    Object.keys(obj).forEach((key) => defineReative(obj, key, obj[key]));
  }
}

// 编译
class Compiler {
  constructor(vm, el) {
    this.$vm = vm;
    this.$el = document.querySelector(el);
    this.methods = this.$vm.methods;

    if (this.$el) {
      this.compile(this.$el);
    }
  }

  // 编译
  compile(el) {
    const childNodes = el.childNodes;

    childNodes.forEach((childNode) => {
      if (this.isElemnt(childNode)) {
        console.log("编译元素", childNode.nodeName);
        this.compileElement(childNode);
      } else if (this.isInter(childNode)) {
        console.log("编译插入文本", childNode.textContent);
        this.compileText(childNode);
      }

      if (childNode.childNodes && childNode.childNodes.length) {
        this.compile(childNode);
      }
    });
  }

  // 判断元素节点
  isElemnt(node) {
    return node.nodeType === 1;
  }

  // 判断文本节点
  isInter(node) {
    return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent);
  }

  // 判断指令
  isDirective(attrName) {
    return attrName.indexOf("m-") === 0;
  }

  // 判断事件指令
  isEventDirective(attrName) {
    return attrName.startsWith("@");
  }

  // 编译文本
  compileText(node) {
    this.update(node, RegExp.$1, "text");
    // node.textContent = this.$vm[exp];
  }

  // 编译m-text
  textLoader(node, exp) {
    this.update(node, exp, "text");
    // node.textContent = this.$vm[exp];
  }

  // 编译m-html
  htmlLoader(node, exp) {
    this.update(node, exp, "html");
    // node.innerHTML = this.$vm[exp];
  }

  // 编译m-model
  modelLoader(node, exp) {
    this.update(node, exp, "model");
  }

  // 编译m-if
  ifLoader(node, exp) {
    this.update(node, exp, "if");
  }

  // 编译元素
  compileElement(node) {
    const attrs = node.attributes;

    Array.from(attrs).forEach((attr) => {
      const attrName = attr.name;
      const exp = attr.value;

      if (this.isDirective(attrName)) {
        const dir = attrName.substring(2);

        this[dir + "Loader"] && this[dir + "Loader"](node, exp);
      }

      if (this.isEventDirective(attrName)) {
        const type = attrName.substring(1);

        if (!this.methods[exp]) {
          console.warn(`Unknown methods type: ${exp}`);
          return;
        }

        this.bindEvent(node, type, this.methods[exp].bind(this.$vm));
      }
    });
  }

  // 统一响应更新
  update(node, exp, dir) {
    const fn = this[dir + "Updater"].bind(this.$vm);
    fn && fn(node, this.$vm[exp], exp);

    new Watcher(this.$vm, exp, function (val) {
      fn && fn(node, val, exp);
    });
  }

  // text updater
  textUpdater(node, value) {
    node.textContent = value;
  }

  // html updater
  htmlUpdater(node, value) {
    node.innerHTML = value;
  }

  // if updater
  ifUpdater(node, value) {
    node.style.display = value ? "block" : "none";
  }

  // model updater
  modelUpdater(node, value, exp) {
    if (node.nodeName === "INPUT") {
      node.value = value;
      node.addEventListener(
        "input",
        (e) => {
          this[exp] = e.target.value;
        },
        false
      );
    }
  }

  // 绑定事件
  bindEvent(node, type, fn, capture = false) {
    if (!type) {
      return;
    }
    node.addEventListener(
      type,
      function (e) {
        fn && fn();
      },
      capture
    );
  }
}

// 管家收集事件
// 每一个数据响应事件都对应一个watcher
class Watcher {
  constructor(vm, key, updateFn) {
    this.$vm = vm;
    this.key = key;
    this.updateFn = updateFn;

    Dep.target = this;

    this.$vm[key];
    Dep.target = null;
  }

  update() {
    this.updateFn.call(this.$vm, this.$vm[this.key]);
  }
}

// dep
class Dep {
  constructor() {
    this.deps = [];
  }

  addDep(watcher) {
    this.deps.push(watcher);
  }

  // 通知更新
  notify() {
    this.deps.forEach((dep) => dep.update());
  }
}

// 数据代理到顶层
function proxy(vm) {
  Object.keys(vm.$data).forEach((key) => {
    Object.defineProperty(vm, key, {
      get() {
        return vm.$data[key];
      },
      set(v) {
        vm.$data[key] = v;
      },
    });
  });
}

function observe(obj) {
  if (typeof obj !== "object" || obj === null) {
    return;
  }

  new Observer(obj);
}

function defineReative(obj, key, value) {
  observe(value);

  // 每执行一次defineReative，就会创建一个Dep实例
  const dep = new Dep();

  Object.defineProperty(obj, key, {
    get() {
      Dep.target && dep.addDep(Dep.target);
      return value;
    },
    set(newValue) {
      if (newValue !== value) {
        value = newValue;

        observe(value);

        // 通知更新
        dep.notify();
      }
    },
  });
}
