import { SyncOutlined, UploadOutlined } from '@ant-design/icons'
import { isMac } from '@renderer/config/constant'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useSettings } from '@renderer/hooks/useSettings'
import { useAppDispatch } from '@renderer/store'
import {
  AssistantIconType,
  DEFAULT_SIDEBAR_ICONS,
  InputBarButton,
  WallpaperCoverage,
  setAssistantIconType,
  setClickAssistantToShowTopic,
  setCustomCss,
  setShowTopicTime,
  setSidebarIcons,
  setWallpaperCoverage,
  setWallpaperOpacity,
  setWallpaperPosition,
  setWallpaperUrl
} from '@renderer/store/settings'
import { ThemeMode } from '@renderer/types'
import { Button, Input, Segmented, Slider, Switch, Tooltip, Upload } from 'antd'
import { FC, useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { SettingContainer, SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '..'
import EnableDeepResearch from './EnableDeepResearch'
import InputBarButtonsManager from './InputBarButtonsManager'
import SidebarIconsManager from './SidebarIconsManager'

const DisplaySettings: FC = () => {
  const {
    setTheme,
    theme,
    windowStyle,
    setWindowStyle,
    topicPosition,
    setTopicPosition,
    clickAssistantToShowTopic,
    showTopicTime,
    customCss,
    sidebarIcons,
    assistantIconType,
    inputBarDisabledButtons,
    wallpaperUrl,
    wallpaperCoverage,
    wallpaperOpacity,
    wallpaperPosition
  } = useSettings()
  const { theme: themeMode } = useTheme()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const [visibleIcons, setVisibleIcons] = useState(sidebarIcons?.visible || DEFAULT_SIDEBAR_ICONS)
  const [disabledIcons, setDisabledIcons] = useState(sidebarIcons?.disabled || [])
  const [disabledButtons, setDisabledButtons] = useState<InputBarButton[]>(inputBarDisabledButtons || [])
  const [customSelector, setCustomSelector] = useState('')
  const isInitialMount = useRef(true)

  const handleWindowStyleChange = useCallback(
    (checked: boolean) => {
      setWindowStyle(checked ? 'transparent' : 'opaque')
    },
    [setWindowStyle]
  )

  const handleReset = useCallback(() => {
    setVisibleIcons([...DEFAULT_SIDEBAR_ICONS])
    setDisabledIcons([])
    dispatch(setSidebarIcons({ visible: DEFAULT_SIDEBAR_ICONS, disabled: [] }))
  }, [dispatch])

  const themeOptions = useMemo(
    () => [
      {
        value: ThemeMode.light,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="iconfont icon-theme icon-theme-light" />
            <span>{t('settings.theme.light')}</span>
          </div>
        )
      },
      {
        value: ThemeMode.dark,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="iconfont icon-theme icon-dark1" />
            <span>{t('settings.theme.dark')}</span>
          </div>
        )
      },
      {
        value: ThemeMode.auto,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <SyncOutlined />
            <span>{t('settings.theme.auto')}</span>
          </div>
        )
      },
      {
        value: ThemeMode.timeBasedAuto,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="iconfont icon-theme icon-time" />
            <span>{t('settings.theme.timeBasedAuto') || '基于时间'}</span>
          </div>
        )
      }
    ],
    [t]
  )

  const assistantIconTypeOptions = useMemo(
    () => [
      { value: 'model', label: t('settings.assistant.icon.type.model') },
      { value: 'emoji', label: t('settings.assistant.icon.type.emoji') },
      { value: 'none', label: t('settings.assistant.icon.type.none') }
    ],
    [t]
  )

  const handleWallpaperUpload = useCallback(
    async (file: File) => {
      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          if (dataUrl) {
            dispatch(setWallpaperUrl(dataUrl))
          }
        }
        reader.readAsDataURL(file)
        return false // 阻止自动上传
      } catch (error) {
        console.error('壁纸上传失败:', error)
        return false
      }
    },
    [dispatch]
  )

  const coverageOptions = useMemo(
    () => [
      { value: 'full', label: t('settings.display.wallpaper.coverage.full') || '全屏' },
      { value: 'messages-only', label: t('settings.display.wallpaper.coverage.messages') || '仅聊天区域' },
      { value: 'custom', label: t('settings.display.wallpaper.coverage.custom') || '自定义' }
    ],
    [t]
  )

  const handleRemoveWallpaper = useCallback(() => {
    dispatch(setWallpaperUrl(''))
  }, [dispatch])

  const positionOptions = useMemo(
    () => [
      { value: 'center', label: t('settings.display.wallpaper.position.center') || '居中' },
      { value: 'top', label: t('settings.display.wallpaper.position.top') || '顶部' },
      { value: 'bottom', label: t('settings.display.wallpaper.position.bottom') || '底部' },
      { value: 'left', label: t('settings.display.wallpaper.position.left') || '左侧' },
      { value: 'right', label: t('settings.display.wallpaper.position.right') || '右侧' },
      { value: 'top left', label: t('settings.display.wallpaper.position.topleft') || '左上角' },
      { value: 'top right', label: t('settings.display.wallpaper.position.topright') || '右上角' },
      { value: 'bottom left', label: t('settings.display.wallpaper.position.bottomleft') || '左下角' },
      { value: 'bottom right', label: t('settings.display.wallpaper.position.bottomright') || '右下角' }
    ],
    [t]
  )

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      try {
        const savedSelector = localStorage.getItem('wallpaper-custom-selector')
        if (savedSelector && savedSelector.trim()) {
          setCustomSelector(savedSelector)
        } else {
          setCustomSelector('#messages')
        }
      } catch (e) {
        console.error('读取壁纸选择器配置时出错:', e)
        setCustomSelector('#messages')
      }
    }
  }, [])

  const selectorSaveTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleSelectorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomSelector(value)

    if (selectorSaveTimeout.current) {
      clearTimeout(selectorSaveTimeout.current)
    }

    selectorSaveTimeout.current = setTimeout(() => {
      try {
        if (value && value.trim()) {
          localStorage.setItem('wallpaper-custom-selector', value)
        }
      } catch (e) {
        console.error('保存自定义选择器时出错:', e)
      }
    }, 500)
  }, [])

  return (
    <SettingContainer theme={themeMode}>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.display.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.theme.title')}</SettingRowTitle>
          <Segmented value={theme} shape="round" onChange={setTheme} options={themeOptions} />
        </SettingRow>
        {isMac && (
          <>
            <SettingDivider />
            <SettingRow>
              <SettingRowTitle>{t('settings.theme.window.style.transparent')}</SettingRowTitle>
              <Switch checked={windowStyle === 'transparent'} onChange={handleWindowStyleChange} />
            </SettingRow>
          </>
        )}
      </SettingGroup>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.display.topic.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.topic.position')}</SettingRowTitle>
          <Segmented
            value={topicPosition || 'right'}
            shape="round"
            onChange={setTopicPosition}
            options={[
              { value: 'left', label: t('settings.topic.position.left') },
              { value: 'right', label: t('settings.topic.position.right') }
            ]}
          />
        </SettingRow>
        <SettingDivider />
        {topicPosition === 'left' && (
          <>
            <SettingRow>
              <SettingRowTitle>{t('settings.advanced.auto_switch_to_topics')}</SettingRowTitle>
              <Switch
                checked={clickAssistantToShowTopic}
                onChange={(checked) => dispatch(setClickAssistantToShowTopic(checked))}
              />
            </SettingRow>
            <SettingDivider />
          </>
        )}
        <SettingRow>
          <SettingRowTitle>{t('settings.topic.show.time')}</SettingRowTitle>
          <Switch checked={showTopicTime} onChange={(checked) => dispatch(setShowTopicTime(checked))} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.display.assistant.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.assistant.icon.type')}</SettingRowTitle>
          <Segmented
            value={assistantIconType}
            shape="round"
            onChange={(value) => dispatch(setAssistantIconType(value as AssistantIconType))}
            options={assistantIconTypeOptions}
          />
        </SettingRow>
      </SettingGroup>
      <SettingGroup theme={theme}>
        <SettingTitle
          style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('settings.display.sidebar.title')}</span>
          <ResetButtonWrapper>
            <Button onClick={handleReset}>{t('common.reset')}</Button>
          </ResetButtonWrapper>
        </SettingTitle>
        <SettingDivider />
        <SidebarIconsManager
          visibleIcons={visibleIcons}
          disabledIcons={disabledIcons}
          setVisibleIcons={setVisibleIcons}
          setDisabledIcons={setDisabledIcons}
        />
      </SettingGroup>

      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.display.inputbar.title') || '输入框按钮设置'}</SettingTitle>
        <SettingDivider />
        <SettingHelpText>{t('settings.display.inputbar.description') || '选择要在输入框中显示的功能按钮'}</SettingHelpText>
        <InputBarButtonsManager
          disabledButtons={disabledButtons}
          setDisabledButtons={setDisabledButtons}
        />
      </SettingGroup>

      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.display.wallpaper.title') || '聊天背景壁纸'}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.display.wallpaper.upload') || '上传壁纸'}</SettingRowTitle>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleWallpaperUpload}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>
                {t('settings.display.wallpaper.select') || '选择图片'}
              </Button>
            </Upload>
            {wallpaperUrl && (
              <Button danger onClick={handleRemoveWallpaper}>
                {t('settings.display.wallpaper.remove') || '移除壁纸'}
              </Button>
            )}
          </div>
        </SettingRow>

        {wallpaperUrl && (
          <>
            <SettingDivider />
            <SettingRow>
              <SettingRowTitle>{t('settings.display.wallpaper.preview') || '壁纸预览'}</SettingRowTitle>
              <WallpaperPreview src={wallpaperUrl} alt="Wallpaper preview" />
            </SettingRow>
            <SettingDivider />
            <SettingRow>
              <SettingRowTitle>{t('settings.display.wallpaper.coverage') || '覆盖范围'}</SettingRowTitle>
              <Segmented
                value={wallpaperCoverage}
                shape="round"
                onChange={(value) => dispatch(setWallpaperCoverage(value as WallpaperCoverage))}
                options={coverageOptions}
              />
            </SettingRow>

            {wallpaperCoverage === 'custom' && (
              <>
                <SettingDivider />
                <SettingRow>
                  <SettingRowTitle>
                    <Tooltip title={t('settings.display.wallpaper.custom.selector.tooltip') || '使用CSS选择器指定壁纸应用位置，如 #messages, .chat-container'}>
                      {t('settings.display.wallpaper.custom.selector') || '自定义选择器'}
                    </Tooltip>
                  </SettingRowTitle>
                  <Input
                    value={customSelector}
                    onChange={handleSelectorChange}
                    placeholder="#messages, .chat-container"
                    style={{ width: '300px' }}
                  />
                </SettingRow>
              </>
            )}

            <SettingDivider />
            <SettingRow>
              <SettingRowTitle>{t('settings.display.wallpaper.position') || '壁纸位置'}</SettingRowTitle>
              <Segmented
                value={wallpaperPosition}
                shape="round"
                onChange={(value) => dispatch(setWallpaperPosition(value as string))}
                options={positionOptions}
              />
            </SettingRow>
            <SettingDivider />
            <SettingRow>
              <SettingRowTitle>{t('settings.display.wallpaper.opacity') || '透明度'}</SettingRowTitle>
              <div style={{ width: '300px' }}>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={wallpaperOpacity}
                  onChange={(value) => dispatch(setWallpaperOpacity(value as number))}
                  tooltip={{ formatter: (value) => `${Math.round((value as number) * 100)}%` }}
                />
              </div>
            </SettingRow>
          </>
        )}
      </SettingGroup>

      <EnableDeepResearch />
      <SettingGroup theme={theme}>
        <SettingTitle>
          {t('settings.display.custom.css')}
          <TitleExtra onClick={() => window.api.openWebsite('https://cherrycss.com/')}>
            {t('settings.display.custom.css.cherrycss')}
          </TitleExtra>
        </SettingTitle>
        <SettingDivider />
        <Input.TextArea
          value={customCss}
          onChange={(e) => dispatch(setCustomCss(e.target.value))}
          placeholder={t('settings.display.custom.css.placeholder')}
          style={{
            minHeight: 200,
            fontFamily: 'monospace'
          }}
        />
      </SettingGroup>
    </SettingContainer>
  )
}

const TitleExtra = styled.div`
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.7;
`
const ResetButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`
const SettingHelpText = styled.div`
  margin-bottom: 16px;
  color: var(--color-text-2);
  font-size: 14px;
`

const WallpaperPreview = styled.img`
  max-width: 300px;
  max-height: 150px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--color-border);
`

export default DisplaySettings
