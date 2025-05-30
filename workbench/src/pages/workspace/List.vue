<template>
  <div class="contentContainer" :style="{ backgroundColor: selectedBgColor }">
    <div class="header">
      <div class="headerLeft">
        <el-input
          v-model="searchText"
          style="width: 300px; --el-border-radius-base: 16px"
          placeholder="搜索文件/文件夹"
          clearable
          :prefix-icon="Search"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="headerRight">
        <Avatar></Avatar>

        <!-- 新增颜色选择按钮 -->
        <el-color-picker
          v-model="selectedBgColor"
          show-alpha
          :predefine="predefinedColors"
          @change="applyColor"
          class="header-btn color-picker-btn"
        >
          <template #trigger>
            <el-button
              plain
              class="color-trigger-btn"
              @click.stop
            >
              <i class="iconfont icon-palette"></i> <!-- 使用您的调色盘图标 -->
            </el-button>
          </template>
        </el-color-picker>
        <!-- 新增颜色选择按钮 -->

        <!-- 上传背景图片按钮 -->
        <el-upload
          action="#"
          :show-file-list="false"
          :before-upload="beforeUploadBgImage"
          accept="image/*"
          class="header-btn"
        >
          <el-button plain>
            <i class="iconfont icon-image"></i>
            <span>背景图片</span>
          </el-button>
        </el-upload>
      </div>
    </div>
    <div class="content">
      <div class="contentHeader">
        <div class="left">
          <!-- 多选操作 -->
          <div class="selectActionBox" v-if="checkedFileList.length > 0">
            <el-checkbox
              v-model="isCheckAll"
              :indeterminate="isIndeterminate"
              label="全选"
              size="large"
              @change="onCheckAllChange"
            />
            <div class="actionBtn" @click="copyOrMoveFiles">
              <span class="iconfont icon-a-yidong2"></span>
              <span class="text">移动/复制</span>
            </div>
            <div class="actionBtn delete" @click="deleteFiles">
              <span class="iconfont icon-shanchu"></span>
              <span class="text">删除</span>
            </div>
            <div class="actionBtn" @click="exitSelect">
              <span class="iconfont icon-guanbi"></span>
              <span class="text">取消批量操作</span>
            </div>
          </div>
          <!-- 搜索提示 -->
          <div class="searchTip" v-else-if="isSearch">
            “{{ currentSearchText }}”的搜索结果：
          </div>
          <!-- 文件夹路径 -->
          <FolderPath
            v-else
            :pathList="currentFolderPath"
            :current="currentFolder"
            @click="onFolderPathClick"
          ></FolderPath>
          <!-- <div class="folderPath" v-else>
            <div
              class="folderItem"
              v-for="item in currentFolderPath"
              :key="item.id"
              :class="{
                isCurrent: currentFolder && currentFolder.id === item.id
              }"
              @click="onFolderPathClick(item)"
            >
              {{ item.name }}
              <el-icon class="icon"><ArrowRight /></el-icon>
            </div>
          </div> -->
        </div>
        <div class="right">
          <!-- 操作按钮 -->
          <el-button class="marginRight" @click="createFolder" v-if="!isSearch"
            >新建文件夹</el-button
          >
          <TypeFilter
            class="marginRight"
            :filterType="currentFilterType"
            @change="onFilterTypeChange"
          ></TypeFilter>
          <Sort
            v-if="!isSearch"
            class="marginRight"
            :sortField="currentSortField"
            :sortType="currentSortType"
            @changeType="onsortTypeChange"
            @changeField="onSortFieldChange"
          ></Sort>
          <el-tooltip
            effect="light"
            :content="currentLayoutType === 'grid' ? '网格视图' : '列表视图'"
            placement="bottom"
          >
            <IconBtn
              :icon="
                currentLayoutType === 'grid'
                  ? 'icon-shuanglieliebiao'
                  : 'icon-danlieliebiao'
              "
              @click="toggleLayoutType"
            ></IconBtn>
          </el-tooltip>
        </div>
      </div>
      <div class="contentBody" @contextmenu.stop.prevent="onContextMenu">
        <!-- 视图 -->
        <View
          :view="currentLayoutType"
          :fileList="fileList"
          :folderList="folderList"
          :isLoading="isLoading"
          :isSelectMode="checkedFileList.length > 0"
          :fileAdditionalMenuList="fileAdditionalMenuList"
          @folderClick="onFolderClick"
          @renamed="reloadList"
          @moved="reloadList"
          @deleted="reloadList"
        ></View>
        <!-- 无数据 -->
        <NoData
          :tip="isSearch ? '搜索无结果' : '点击左上角「创建」吧'"
          :showAddIcon="!isSearch"
          v-if="!isLoading && folderList.length <= 0 && fileList.length <= 0"
        ></NoData>
        <!-- 右键菜单 -->
        <ContextMenu
          ref="ContextMenuRef"
          @createFolder="createFolder"
        ></ContextMenu>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { Search, ArrowRight } from '@element-plus/icons-vue'
import Avatar from './components/common/Avatar.vue'
import { useStore } from '@/store'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import NoData from './components/common/NoData.vue'
import ContextMenu from './components/content/ContextMenu.vue'
import emitter from '@/utils/eventBus'
import IconBtn from './components/common/IconBtn.vue'
import TypeFilter from './components/content/TypeFilter.vue'
import Sort from './components/content/Sort.vue'
import View from './components/content/View.vue'
import useLayoutChange from '@/hooks/useLayoutChange'
import { emitContextmenuEvent } from '@/hooks/useContextMenuEvent'
import { RESOURCE_TYPES } from '@/constant'
import FolderPath from './components/content/FolderPath.vue'

const selectedBgColor = ref('#FFFFFF') // 默认白色

// 精确匹配图片中的调色盘预定义颜色
const predefinedColors = [
  // 第一行灰色系
  '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD',
  // 第二行深色系
  '#9E9E9E', '#757575', '#616161', '#424242',
  // 其他色系（根据实际需求调整）
  '#FF5252', '#FF4081', '#E040FB', '#7C4DFF'
]

// 应用颜色（直接选择即生效）
const applyColor = (color) => {
  document.documentElement.style.setProperty('--page-bg-color', color)
  localStorage.setItem('pageBgColor', color)
}

// 初始化
onMounted(() => {
  const savedColor = localStorage.getItem('pageBgColor') || '#FFFFFF'
  selectedBgColor.value = savedColor
  document.documentElement.style.setProperty('--page-bg-color', savedColor)

  // 检查是否有背景图片配置
  const store = useStore()
  store.getUserConfig().then(config => {
    if (config.backGroupImg) {
      applyBackgroundImage(config.backGroupImg)
    }
  })
})

// 上传背景图片前的处理
const beforeUploadBgImage = async (file) => {
  try {
    // 检查文件类型
    // if (!file.type.startsWith('image/')) {
    //   ElMessage.error('请上传图片文件')
    //   return false
    // }

    // 创建FormData对象
    const formData = new FormData()
    formData.append('file', file)

    // 调用上传接口
    const { data } = await api.uploadFiles(formData)
    const imageUrl = data[0]

    // 更新用户配置
    const store = useStore()
    await store.updateUserConfig({
      backGroupImg: imageUrl
    })

    // 应用背景图片
    applyBackgroundImage(imageUrl)

    return false // 阻止默认上传行为
  } catch (error) {
    console.error('上传背景图片失败:', error)
    ElMessage.error('上传背景图片失败')
    return false
  }
}

// 应用背景图片
const applyBackgroundImage = (imageUrl) => {
  if (imageUrl) {
    document.documentElement.style.setProperty(
      '--page-bg-image',
      `url(${imageUrl})`
    )
    // document.documentElement.style.setProperty(
    //   '--page-bg-style',
    //   'center / cover no-repeat fixed'
    // )
  } else {
    document.documentElement.style.removeProperty('--page-bg-image')
    // document.documentElement.style.removeProperty('--page-bg-style')
  }
}

const store = useStore()

// 刷新当前列表列表
const reloadList = () => {
  if (isSearch.value) {
    searchFolderAndFileList()
  } else {
    getFolderAndFileList()
  }
}

// 1.搜索
const isSearch = ref(false)
const searchText = ref('')
const currentSearchText = ref('')
const fileAdditionalMenuList = computed(() => {
  return isSearch.value
    ? [
        {
          name: '打开所在文件夹',
          value: 'locationFolder',
          icon: 'icon-wenjianjia1',
          onClick: item => {
            onFolderClick(item, true)
          }
        }
      ]
    : []
})

const onSearch = () => {
  const text = searchText.value.trim()
  if (text) {
    isSearch.value = true
    currentSearchText.value = text
    clearCurrentNode()
    searchFolderAndFileList()
  }
}
const resetSearch = () => {
  isSearch.value = false
  searchText.value = ''
  currentSearchText.value = ''
}
const searchFolderAndFileList = async () => {
  try {
    folderList.value = []
    fileList.value = []
    isLoading.value = true
    const { data } = await api.searchFolderAndFile({
      name: currentSearchText.value,
      fileType: currentFilterType.value === 'all' ? '' : currentFilterType.value
    })
    folderList.value = data.folderList || []
    fileList.value = data.fileList || []
    isLoading.value = false
  } catch (error) {
    console.log(error)
    isLoading.value = false
  }
}

// 2.获取文件列表
const currentFolder = computed(() => {
  return store.currentFolder
})
const currentFolderPath = computed(() => {
  return store.currentFolderPath
})
const folderList = ref([])
const fileList = ref([])
const isLoading = ref(true)
const currentFilterType = ref('all')
const currentSortField = ref('createAt')
const currentSortType = ref('desc')

// 获取文件夹和文件列表
const getFolderAndFileList = async () => {
  try {
    if (isSearch.value) return
    folderList.value = []
    fileList.value = []
    isLoading.value = true
    const { data } = await api.getFolderAndFileList({
      folderId: currentFolder.value ? currentFolder.value.id : '',
      fileType:
        currentFilterType.value === 'all' ? '' : currentFilterType.value,
      sortField: currentSortField.value,
      sortType: currentSortType.value
    })
    if (currentFolder.value === null) {
      const folder = data.folderList[0]
      store.setCurrentFolder(folder)
      store.setCurrentFolderPath([folder])
      return
    }
    folderList.value = data.folderList || []
    fileList.value = (data.fileList || []).map(item => {
      return {
        ...item,
        checked: false
      }
    })
    isLoading.value = false
  } catch (error) {
    console.log(error)
    isLoading.value = false
  }
}
emitter.on('refresh_list', getFolderAndFileList)
// 监听当前所在文件夹，改变了刷新列表数据
watch(
  () => {
    return currentFolder.value
  },
  () => {
    if (!currentFolder.value) {
      return
    }
    // 如果当前处于搜索状态
    if (isSearch.value) {
      resetSearch()
    }
    getFolderAndFileList()
  },
  {
    immediate: true
  }
)

// 修改过滤类型
const onFilterTypeChange = val => {
  currentFilterType.value = val
  reloadList()
}
// 排序改变
const onSortFieldChange = val => {
  currentSortField.value = val
  getFolderAndFileList()
}
const onsortTypeChange = val => {
  currentSortType.value = val
  getFolderAndFileList()
}

// 文件夹路径点击
const onFolderPathClick = folder => {
  store.setCurrentFolder(folder)
  const index = currentFolderPath.value.findIndex(item => {
    return item.id === folder.id
  })
  store.setCurrentFolderPath(currentFolderPath.value.slice(0, index + 1))
}

// 文件夹点击
const onFolderClick = async (folder, isFile = false) => {
  try {
    let path = []
    if (isSearch.value) {
      const { data } = await api.getFolderPath({
        folderId: folder.id
      })
      if (isFile) {
        path = data.slice(0, -1)
        folder = path[path.length - 1]
      } else {
        path = data
      }
    }
    store.setCurrentFolder(folder)
    store.setCurrentFolderPath(
      isSearch.value ? path : [...currentFolderPath.value, folder]
    )
  } catch (error) {
    console.log(error)
  }
}

// 清空当前所在的文件夹信息
const clearCurrentNode = () => {
  store.setCurrentFolderPath([])
  store.setCurrentFolder(null)
}

// 3.文件多选
const isCheckAll = ref(false)
const checkedFileList = computed(() => {
  return fileList.value
    .filter(item => {
      return item.checked
    })
    .map(item => {
      return {
        ...item
      }
    })
})
watch(
  () => {
    return checkedFileList.value.length
  },
  val => {
    const allLength = fileList.value.length
    isCheckAll.value = allLength > 0 && val >= allLength
  }
)
const isIndeterminate = computed(() => {
  const checkedLength = checkedFileList.value.length
  const allLength = fileList.value.length
  return allLength > 0 && checkedLength > 0 && checkedLength < allLength
})
const onCheckAllChange = val => {
  fileList.value.forEach(item => {
    item.checked = val
  })
}
const exitSelect = () => {
  onCheckAllChange(false)
}
// 移动或复制多个文件
const copyOrMoveFiles = async () => {
  try {
    emitter.emit('show_move_dialog', {
      type: RESOURCE_TYPES.FILE,
      name: '所选文件',
      ids: checkedFileList.value.map(item => {
        return item.id
      }),
      callback: () => {
        reloadList()
      }
    })
  } catch (error) {
    console.log(error)
  }
}
// 删除多个文件
const deleteFiles = async () => {
  ElMessageBox.confirm(`是否确认删除【所选文件】？`, '删除文件', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.deleteFile({
        ids: checkedFileList.value.map(item => {
          return item.id
        })
      })
      ElMessage({
        type: 'success',
        message: '删除成功'
      })
      reloadList()
    } catch (error) {
      console.log(error)
    }
  })
}

// 4.右键菜单
const ContextMenuRef = ref(null)
const onContextMenu = e => {
  emitContextmenuEvent()
  if (ContextMenuRef.value && !isSearch.value) {
    ContextMenuRef.value.show(e)
  }
}
const hideContextMenu = () => {
  if (ContextMenuRef.value) {
    ContextMenuRef.value.hide()
  }
}
emitter.on('contextmenu', hideContextMenu)

// 5.创建文件夹
const createFolder = () => {
  emitter.emit('show_name_edit_dialog', {
    type: RESOURCE_TYPES.FOLDER,
    callback: data => {
      onFolderClick(data)
    }
  })
}

// 6.展示类型
const { currentLayoutType, toggleLayoutType } = useLayoutChange()

onUnmounted(() => {
  emitter.off('refresh_list', getFolderAndFileList)
  emitter.off('contextmenu', hideContextMenu)
})
</script>

<style lang="less" scoped>
.contentContainer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--page-bg-color, #ffffff);
  background-image: var(--page-bg-image, none);
  transition: background-color 0.3s ease, background-image 0.3s ease;
  background-size: 100% 100%; // 添加这一行
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed; // 可选：固定背景不随内容滚动

  .header {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 0 24px;

    .headerRight {
      display: flex;
      align-items: center;
    }
  }

  .content {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 20px;

    .contentHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      margin-bottom: 8px;
      padding: 0 24px;

      .left {
        overflow: hidden;
        margin-right: 12px;

        .searchTip {
          color: #212930;
          height: 40px;
          display: flex;
          align-items: center;
        }

        .selectActionBox {
          display: flex;
          align-items: center;

          .actionBtn {
            display: flex;
            align-items: center;
            color: var(--theme-color);
            margin-left: 15px;
            cursor: pointer;
            user-select: none;

            &:first-of-type {
              margin-left: 20px;
            }

            &:hover {
              &.delete {
                color: #f56c6c;
              }
            }

            .iconfont {
            }

            .text {
              font-size: 14px;
            }
          }
        }

        .folderPath {
          display: flex;
          height: 40px;
          display: flex;
          align-items: center;

          .folderItem {
            color: #9aa5b8;
            font-weight: 400;
            cursor: pointer;
            display: flex;
            align-items: center;
            user-select: none;

            &:hover {
              color: #212930;
            }

            .icon {
              margin-top: 2px;
            }

            &.isCurrent {
              color: #212930;
              cursor: default;

              .icon {
                display: none;
              }
            }
          }
        }
      }

      .right {
        display: flex;
        align-items: center;
        flex-shrink: 0;

        .marginRight {
          margin-right: 12px;
        }
      }
    }

    .contentBody {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 0 14px;
    }
  }
}

// 原有样式不变，添加以下内容
.color-picker-btn {
  margin-left: 12px;
  cursor: pointer;
}

.color-picker-panel {
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;

  .el-color-picker {
    margin-bottom: 12px;
  }

  .confirm-btn {
    margin-bottom: 8px;
  }
}

.headerRight {
  display: flex;
  align-items: center;
}
</style>

<style scoped>
/* 右上角按钮容器 */
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 所有头部按钮统一样式 */
.header-btn {
  margin-left: 0;
  padding: 6px 12px;
}

/* 调色盘触发按钮特殊样式 */
.color-trigger-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-color: #fff; /* 白色边框 */
  background-color: #fff; /* 白色背景 */

  &:hover {
    background-color: #f5f5f5;
  }

  i {
    font-size: 18px;
    color: #555; /* 图标颜色 */
  }
}

/* 调色盘弹出面板样式调整 */
:deep(.el-color-picker__panel) {
  width: 280px !important;
  border-radius: 4px !important;
}

:deep(.el-color-dropdown__btns) {
  padding: 8px !important;
}
</style>
