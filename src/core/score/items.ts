import type { Dimension } from '../rules/types'

export interface RulePoint {
  dimension: Dimension
  points: number
  label: string
}

export const DIMENSION_LABELS: Record<Dimension, string> = {
  docs: '文档完备',
  deps: '依赖可复现',
  run: '启动清晰',
  portability: '跨平台友好',
  security: '安全合规',
}

export const DIMENSION_ORDER: Dimension[] = ['docs', 'deps', 'run', 'portability', 'security']

export const RULE_POINTS: Record<string, RulePoint> = {
  'DOC-01': { dimension: 'docs', points: 8, label: 'README 存在' },
  'DOC-02': { dimension: 'docs', points: 6, label: '安装 / 构建说明' },
  'DOC-03': { dimension: 'docs', points: 4, label: '配置 / 环境变量说明' },
  'DOC-04': { dimension: 'docs', points: 2, label: '结构质量' },

  'DEP-01': { dimension: 'deps', points: 10, label: '依赖清单存在' },
  'DEP-02': { dimension: 'deps', points: 6, label: '锁文件 / 固定版本' },
  'DEP-03': { dimension: 'deps', points: 4, label: '清单可解析' },

  'RUN-01': { dimension: 'run', points: 8, label: '启动线索' },
  'RUN-02': { dimension: 'run', points: 6, label: 'README 启动命令' },
  'RUN-03': { dimension: 'run', points: 3, label: '运行时版本声明' },
  'RUN-04': { dimension: 'run', points: 3, label: '跨平台启动' },

  'PATH-01': { dimension: 'portability', points: 8, label: 'Windows 盘符路径' },
  'PATH-02': { dimension: 'portability', points: 5, label: 'macOS 用户路径' },
  'PATH-03': { dimension: 'portability', points: 4, label: 'Linux 用户目录' },
  'PATH-04': { dimension: 'portability', points: 3, label: 'file:// 或 UNC' },

  'SEC-01': { dimension: 'security', points: 8, label: '私钥' },
  'SEC-02': { dimension: 'security', points: 6, label: '.env 入库' },
  'SEC-03': { dimension: 'security', points: 4, label: '高置信 Key' },
  'SEC-04': { dimension: 'security', points: 2, label: '其他敏感信息' },
}

export const RULE_VERSION = 'rules-v1'
