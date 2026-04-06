// components/food-form/food-form.js
const { FOOD_ACCEPTANCE } = require('../../utils/constants')

// 常见辅食列表（对象数组，带 _selected 标记）
const COMMON_FOODS = [
  '米粉', '蛋黄', '南瓜', '胡萝卜', '土豆',
  '苹果泥', '香蕉', '菠菜', '西兰花', '鸡胸肉',
  '鱼肉', '豆腐', '米粥', '面条', '红薯'
].map(name => ({ label: name, _selected: false }))

Component({
  properties: {
    defaultData: { type: Object, value: {} }
  },
  data: {
    commonFoods: COMMON_FOODS,
    customFoodList: [],    // 自定义添加的食物（字符串数组，添加即选中）
    customFood: '',
    amount: '',
    acceptance: '',
    isNewFood: false,
    acceptanceLevels: Object.values(FOOD_ACCEPTANCE)
  },
  lifetimes: {
    attached() {
      if (this.properties.defaultData) {
        const d = this.properties.defaultData
        const savedFoods = d.foods || []

        // 恢复常见食物的选中状态
        const commonFoods = COMMON_FOODS.map(f => {
          const sel = savedFoods.indexOf(f.label) >= 0
          return { label: f.label, _selected: sel }
        })

        // 不在常见列表里的 → 放入 customFoodList
        const commonLabels = COMMON_FOODS.map(f => f.label)
        const customFoodList = savedFoods.filter(f => commonLabels.indexOf(f) < 0)

        this.setData({
          commonFoods,
          customFoodList,
          amount: d.amount || '',
          acceptance: d.acceptance || '',
          isNewFood: d.isNewFood || false
        })
      }
    }
  },
  methods: {
    // 切换食物选择（翻转 _selected）
    toggleFood(e) {
      const label = e.currentTarget.dataset.label
      const commonFoods = this.data.commonFoods.map(f => {
        if (f.label === label) {
          return { ...f, _selected: !f._selected }
        }
        return f
      })
      this.setData({ commonFoods })
      this._emitChange()
    },

    // 自定义食物输入
    onCustomFoodInput(e) {
      this.setData({ customFood: e.detail.value })
    },

    // 回车添加自定义食物
    addCustomFood() {
      const food = this.data.customFood.trim()
      if (!food) return

      // 已在常见列表里 → 直接触发选中
      const inCommon = this.data.commonFoods.find(f => f.label === food)
      if (inCommon) {
        if (!inCommon._selected) {
          const commonFoods = this.data.commonFoods.map(f => {
            if (f.label === food) return { ...f, _selected: true }
            return f
          })
          this.setData({ commonFoods, customFood: '' })
        } else {
          this.setData({ customFood: '' })
        }
        this._emitChange()
        return
      }

      // 已在自定义列表里 → 不重复添加
      if (this.data.customFoodList.indexOf(food) >= 0) {
        this.setData({ customFood: '' })
        return
      }

      const customFoodList = this.data.customFoodList.concat([food])
      this.setData({ customFoodList, customFood: '' })
      this._emitChange()
    },

    // 删除自定义食物
    removeCustomFood(e) {
      const food = e.currentTarget.dataset.food
      const customFoodList = this.data.customFoodList.filter(f => f !== food)
      this.setData({ customFoodList })
      this._emitChange()
    },

    // 设置食量
    setAmount(e) {
      this.setData({ amount: e.currentTarget.dataset.val })
      this._emitChange()
    },

    // 选择接受度
    selectAcceptance(e) {
      this.setData({ acceptance: e.currentTarget.dataset.val })
      this._emitChange()
    },

    // 新食物开关
    toggleNewFood() {
      this.setData({ isNewFood: !this.data.isNewFood })
      this._emitChange()
    },

    _emitChange() {
      this.triggerEvent('change', this.getData())
    },

    getData() {
      const selectedCommon = this.data.commonFoods
        .filter(f => f._selected)
        .map(f => f.label)
      const allFoods = selectedCommon.concat(this.data.customFoodList)
      return {
        foods: allFoods,
        amount: this.data.amount,
        acceptance: this.data.acceptance,
        isNewFood: this.data.isNewFood
      }
    },

    validate() {
      const data = this.getData()
      if (data.foods.length === 0) {
        return { valid: false, message: '请选择或输入至少一种食物' }
      }
      return { valid: true }
    }
  }
})
