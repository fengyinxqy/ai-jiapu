import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TreePine } from 'lucide-react'
import { useMemo } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { layoutTree } from '../layout'
import type { Person, Tree } from '../types'
import { PersonNode } from './PersonNode'

const nodeTypes = { person: PersonNode } satisfies NodeTypes

interface FamilyTreeCanvasProps {
  tree: Tree
  onSelect: (person: Person | null) => void
}

export function FamilyTreeCanvas({ tree, onSelect }: FamilyTreeCanvasProps) {
  const { nodes, edges } = useMemo(() => layoutTree(tree), [tree])

  return (
    <div className="relative min-w-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        onNodeClick={(_, node) => {
          onSelect(tree.persons.find((p) => p.id === Number(node.id)) ?? null)
        }}
        onPaneClick={() => onSelect(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.5} color="#d8c9a8" />
        <Controls showInteractive={false} />
      </ReactFlow>
      {tree.persons.length === 0 && (
        <Empty className="pointer-events-none absolute inset-0 z-10 bg-background/40">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TreePine />
            </EmptyMedia>
            <EmptyTitle>家谱还是空的</EmptyTitle>
            <EmptyDescription>
              在右侧对话框口述你的家人，AI 会帮你建起来，例如：
              <br />
              「我叫张伟，我父亲叫张建国，母亲叫李秀兰，爷爷叫张守义。」
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
