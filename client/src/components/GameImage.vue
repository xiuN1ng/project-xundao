<template>
  <img 
    v-if="finalSrc" 
    :src="finalSrc" 
    :alt="alt"
    :class="imageClass"
    :style="imageStyle"
    @error="handleError"
  />
  <div v-else class="image-placeholder" :style="placeholderStyle">
    <slot>{{ placeholderText }}</slot>
  </div>
</template>

<script>
import Resources from '@/assets/resources'
import DefaultIcons from '@/assets/defaultResources'

export default {
  name: 'GameImage',
  props: {
    // 资源路径，如 'ui.iconHp', 'player.male.mortal'
    path: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    // CSS类名
    imageClass: {
      type: [String, Object, Array],
      default: ''
    },
    // 自定义样式
    customStyle: {
      type: Object,
      default: () => ({})
    },
    // 占位符文字
    placeholder: {
      type: String,
      default: ''
    },
    // 是否使用默认图标
    useDefault: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      imgError: false
    }
  },
  computed: {
    // 尝试获取资源
    src() {
      if (!this.path) return null
      
      // 解析路径
      const parts = this.path.split('.')
      let result = Resources
      for (const part of parts) {
        result = result?.[part]
      }
      return result || null
    },
    
    // 最终使用的图片
    finalSrc() {
      if (this.imgError || !this.src) {
        return this.useDefault ? this.getDefaultIcon() : null
      }
      return this.src
    },
    
    // 占位符文字
    placeholderText() {
      if (this.placeholder) return this.placeholder
      // 从路径提取名称
      const parts = this.path.split('.')
      return parts[parts.length - 1] || '?'
    },
    
    imageStyle() {
      return {
        ...this.customStyle
      }
    },
    
    placeholderStyle() {
      const size = this.customStyle.width || '48px'
      return {
        backgroundColor: '#333',
        width: size,
        height: this.customStyle.height || size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '12px',
        borderRadius: '4px'
      }
    }
  },
  methods: {
    handleError() {
      this.imgError = true
    },
    
    // 根据路径类型获取默认图标
    getDefaultIcon() {
      const path = this.path.toLowerCase()
      
      if (path.includes('lingshi') || path.includes('stone')) {
        return DefaultIcons.lingshi
      }
      if (path.includes('diamond') || path.includes('zuan')) {
        return DefaultIcons.diamond
      }
      if (path.includes('xiuwei') || path.includes('cultivation')) {
        return DefaultIcons.xiuwei
      }
      if (path.includes('hp') || path.includes('life') || path.includes('shengming')) {
        return DefaultIcons.hp
      }
      if (path.includes('attack') || path.includes('gongji')) {
        return DefaultIcons.attack
      }
      if (path.includes('defense') || path.includes('fangyu')) {
        return DefaultIcons.defense
      }
      if (path.includes('speed') || path.includes('sudu')) {
        return DefaultIcons.speed
      }
      if (path.includes('crit') || path.includes('baoji')) {
        return DefaultIcons.crit
      }
      if (path.includes('dodge') || path.includes('shanbi')) {
        return DefaultIcons.dodge
      }
      if (path.includes('btn') || path.includes('button')) {
        return DefaultIcons.btnNormal
      }
      if (path.includes('player') || path.includes('role')) {
        return DefaultIcons.player
      }
      if (path.includes('beast') || path.includes('pet') || path.includes('lingshou')) {
        return DefaultIcons.beast
      }
      if (path.includes('equipment') || path.includes('weapon') || path.includes('armor')) {
        return DefaultIcons.equipment
      }
      if (path.includes('bg') || path.includes('background')) {
        return DefaultIcons.bg
      }
      
      return DefaultIcons.item
    }
  }
}
</script>

<style scoped>
.image-placeholder {
  border-radius: 4px;
}
</style>
