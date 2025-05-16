<template>
  <div class="vue-component">
    <h3>{{ title }}</h3>
    <button @click="count++">点击了：{{ count }} 次</button>
    <p>这是一个在React应用中的Vue组件</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'VueExample',
  props: {
    title: {
      type: String,
      default: 'Vue 组件示例'
    }
  },
  setup() {
    const count = ref(0);
    
    return {
      count
    };
  }
});
</script>

<style scoped>
.vue-component {
  border: 2px solid #42b983;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  background-color: #f8f8f8;
}
</style> 