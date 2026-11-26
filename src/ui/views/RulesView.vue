<script setup lang="ts">
import { computed } from 'vue'
import { DIMENSION_LABELS, DIMENSION_ORDER, RULE_POINTS, RULE_VERSION } from '../../core/score/items'

interface RuleRow {
  ruleId: string
  label: string
  dimension: string
  points: number
}

const groups = computed(() =>
  DIMENSION_ORDER.map((dim) => ({
    dim,
    label: DIMENSION_LABELS[dim],
    rows: (Object.entries(RULE_POINTS) as Array<[string, { dimension: typeof dim; points: number; label: string }]>)
      .filter(([, p]) => p.dimension === dim)
      .map(([ruleId, p]) => ({ ruleId, label: p.label, dimension: DIMENSION_LABELS[p.dimension], points: p.points })),
  })),
)

const totalRules = computed(() => Object.keys(RULE_POINTS).length)
const totalPoints = computed(() =>
  Object.values(RULE_POINTS).reduce((sum, p) => sum + p.points, 0),
)
</script>

<template>
  <div class="rules">
    <section class="head">
      <h1>检测规则</h1>
      <p class="muted">
        全部 {{ totalRules }} 条规则均为纯函数静态检查，总权重 {{ totalPoints }} 分，
        命中 P0 红线时总分封顶 39。规则版本 <span class="mono">{{ RULE_VERSION }}</span>。
      </p>
    </section>

    <section v-for="g in groups" :key="g.dim" class="group">
      <div class="group-head">
        <h2>{{ g.label }}</h2>
        <span class="muted small mono">{{ g.rows.reduce((s, r) => s + r.points, 0) }} 分</span>
      </div>
      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">规则 ID</th>
              <th scope="col">检查项</th>
              <th scope="col" class="num">分值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in g.rows" :key="row.ruleId">
              <td class="mono rule-id">{{ row.ruleId }}</td>
              <td>{{ row.label }}</td>
              <td class="num mono">{{ row.points }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="note muted small">
      每条规则返回统一的 RuleOutcome 结构（命中状态、置信度、证据与脱敏摘要），
      评分聚合逻辑与规则实现完全解耦，任何检测语义变更都会升级规则版本并在报告中标注。
    </p>
  </div>
</template>

<style scoped>
.head h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.head p {
  margin: 8px 0 0;
  font-size: 14px;
}

.group {
  margin-top: 32px;
}

.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.group-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  color: var(--muted);
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
}

td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
}

tbody tr:last-child td {
  border-bottom: none;
}

.rule-id {
  color: var(--accent);
  font-size: 12px;
  white-space: nowrap;
}

.num {
  text-align: right;
  width: 72px;
}

.note {
  margin-top: 28px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
}
</style>
