import { isMac } from '@renderer/config/constant'
import { isLocalAi } from '@renderer/config/env'
import { useTheme } from '@renderer/context/ThemeProvider'
import db from '@renderer/databases'
import i18n from '@renderer/i18n'
import ASRServerService from '@renderer/services/ASRServerService'
import { useAppDispatch } from '@renderer/store'
import { setAvatar, setFilesPath, setResourcesPath, setUpdateState } from '@renderer/store/runtime'
import { delay, runAsyncFunction } from '@renderer/utils'
import { disableAnalytics, initAnalytics } from '@renderer/utils/analytics'
import { defaultLanguage } from '@shared/config/constant'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'

import { useDefaultModel } from './useAssistant'
import useFullScreenNotice from './useFullScreenNotice'
import { useRuntime } from './useRuntime'
import { useSettings } from './useSettings'
import useUpdateHandler from './useUpdateHandler'

// 生成壁纸CSS样式
function generateWallpaperCSS(url: string, coverage: string, opacity: number, position: string): string {
  if (!url) return ''

  let selector = ''
  switch (coverage) {
    case 'full':
      selector = '.app-container, #root'
      break
    case 'messages-only':
      selector = '#messages'
      break
    case 'custom':
      try {
        // 从localStorage读取自定义选择器，避免在渲染过程中直接访问localStorage
        const customSelector = localStorage.getItem('wallpaper-custom-selector')
        selector = customSelector && customSelector.trim() ? customSelector : '#messages, #chat-main'
      } catch (e) {
        console.error('读取自定义选择器时出错:', e)
        selector = '#messages, #chat-main'
      }
      break
    default:
      selector = '#messages'
  }

  return `
    ${selector} {
      position: relative;
    }
    
    ${selector}::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url('${url}');
      background-size: cover;
      background-position: ${position};
      opacity: ${opacity};
      pointer-events: none;
      z-index: 0;
    }
    
    ${selector} > * {
      position: relative;
      z-index: 1;
      pointer-events: auto;
    }
  `
}

export function useAppInit() {
  const dispatch = useAppDispatch()
  const {
    proxyUrl,
    language,
    windowStyle,
    autoCheckUpdate,
    proxyMode,
    customCss,
    wallpaperUrl,
    wallpaperCoverage,
    wallpaperOpacity,
    wallpaperPosition,
    enableDataCollection,
    asrEnabled,
    asrServiceType,
    asrAutoStartServer
  } = useSettings()
  const { minappShow } = useRuntime()
  const { setDefaultModel, setTopicNamingModel, setTranslateModel } = useDefaultModel()
  const avatar = useLiveQuery(() => db.settings.get('image://avatar'))
  const { theme } = useTheme()

  useUpdateHandler()
  useFullScreenNotice()

  useEffect(() => {
    avatar?.value && dispatch(setAvatar(avatar.value))
  }, [avatar, dispatch])

  useEffect(() => {
    document.getElementById('spinner')?.remove()
    runAsyncFunction(async () => {
      const { isPackaged } = await window.api.getAppInfo()
      if (isPackaged && autoCheckUpdate) {
        await delay(2)
        const { updateInfo } = await window.api.checkForUpdate()
        dispatch(setUpdateState({ info: updateInfo }))
      }
    })
  }, [dispatch, autoCheckUpdate])

  useEffect(() => {
    if (proxyMode === 'system') {
      window.api.setProxy('system')
    } else if (proxyMode === 'custom') {
      proxyUrl && window.api.setProxy(proxyUrl)
    } else {
      window.api.setProxy('')
    }
  }, [proxyUrl, proxyMode])

  useEffect(() => {
    i18n.changeLanguage(language || navigator.language || defaultLanguage)
  }, [language])

  useEffect(() => {
    const transparentWindow = windowStyle === 'transparent' && isMac && !minappShow

    if (minappShow) {
      window.root.style.background = theme === 'dark' ? 'var(--color-black)' : 'var(--color-white)'
      return
    }

    window.root.style.background = transparentWindow ? 'var(--navbar-background-mac)' : 'var(--navbar-background)'
  }, [windowStyle, minappShow, theme])

  useEffect(() => {
    if (isLocalAi) {
      const model = JSON.parse(import.meta.env.VITE_RENDERER_INTEGRATED_MODEL)
      setDefaultModel(model)
      setTopicNamingModel(model)
      setTranslateModel(model)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // set files path
    window.api.getAppInfo().then((info: { filesPath: string; resourcesPath: string }) => {
      dispatch(setFilesPath(info.filesPath))
      dispatch(setResourcesPath(info.resourcesPath))
    })
  }, [dispatch])

  useEffect(() => {
    import('@renderer/queue/KnowledgeQueue')
  }, [])

  useEffect(() => {
    const oldCustomCss = document.getElementById('user-defined-custom-css')
    if (oldCustomCss) {
      oldCustomCss.remove()
    }

    try {
      // 生成壁纸CSS
      const wallpaperCSS = generateWallpaperCSS(wallpaperUrl, wallpaperCoverage, wallpaperOpacity, wallpaperPosition)
      
      // 合并用户自定义CSS和壁纸CSS
      const combinedCSS = wallpaperCSS + (customCss || '')

      if (combinedCSS) {
        const style = document.createElement('style')
        style.id = 'user-defined-custom-css'
        style.textContent = combinedCSS
        document.head.appendChild(style)
      }
    } catch (e) {
      console.error('应用壁纸和自定义CSS时出错:', e)
      // 确保即使壁纸应用失败，自定义CSS仍然能应用
      if (customCss) {
        const style = document.createElement('style')
        style.id = 'user-defined-custom-css'
        style.textContent = customCss
        document.head.appendChild(style)
      }
    }
  }, [customCss, wallpaperUrl, wallpaperCoverage, wallpaperOpacity, wallpaperPosition])

  useEffect(() => {
    if (enableDataCollection) {
      initAnalytics()
      // TODO: init data collection
    } else {
      disableAnalytics()
    }
  }, [enableDataCollection])

  // 自动启动ASR服务器
  useEffect(() => {
    if (asrEnabled && asrServiceType === 'local' && asrAutoStartServer) {
      console.log('自动启动ASR服务器...')
      ASRServerService.startServer().then((success) => {
        if (success) {
          console.log('ASR服务器自动启动成功')
        } else {
          console.error('ASR服务器自动启动失败')
        }
      })
    }
  }, [asrEnabled, asrServiceType, asrAutoStartServer])
}
