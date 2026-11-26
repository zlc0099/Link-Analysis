<script setup lang="ts">
import type { DimensionScore } from '../../core/report/schema'

defineProps<{ dimensions: DimensionScore[] }>()

function statusOf(item: { applicable: boolean; passed: boolean }): string {
  if (!item.applicable) return '不适用'
  return item.passed ? '通过' : '失败'
}
</script>

<template>
  <div class="breakdown">
    <div v-for="d in dimensions" :key="d.dimension" class="dim">
      <div class="dim-head">
        <h3>{{ d.label }}</h3>
        <span class="mono">{{ d.score }} / {{ d.max }}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">规则</th>
            <th scope="col">检查项</th>
            <th scope="col">状态</th>
            <th scope="col" class="num">得分</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in d.items" :key="item.ruleId" :class="{ missed: item.applicable && !item.passed }">
            <td class="mono rule">{{ item.ruleId }}</td>
            <td>{{ item.label }}</td>
            <td>
              <span class="status" :class="{ pass: item.passed, na: !item.applicable }">
                {{ statusOf(item) }}
              </span>
            </td>
            <td class="num mono">{{ item.earned }} / {{ item.points }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.breakdown {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dim-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}

.dim-head h3 {
  margin: 0;
  font-size: 13px;
  color: var(--ink-soft);
}

.dim-head span {
  font-size: 12px;
  color: var(--muted);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  color: var(--muted);
  padding: 6px 10px;
  border-bottom: 1px solid var(--line);
}

td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}

tbody tr:last-child td {
  border-bottom: none;
}

.rule {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.num {
  text-align: right;
  white-space: nowrap;
}

.status {
  display: inline-block;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  background: var(--p0-soft);
  color: var(--p0);
}

.status.pass {
  background: var(--ok-soft);
  color: var(--ok);
}

.status.na {
  background: var(--p3-soft);
  color: var(--p3);
}

tr.missed td {
  background: #fffbfa;
}
</style>
