import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TreePine } from 'lucide-react'
import { Empty } from 'antd'
import { useMemo } from 'react'
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
        <Empty
          className="pointer-events-none absolute inset-0 z-10 m-auto flex-col items-center justify-center"
          image={<TreePine className="size-10 text-primary/60" />}
          description={
            <>
              <p className="mb-1 font-medium text-foreground">家谱还是空的</p>
              <p className="text-sm text-muted-foreground">
                在右侧对话框口述你的家人，AI 会帮你建起来，例如：
                <br />
                「我叫张伟，我父亲叫张建国，母亲叫李秀兰，爷爷叫张守义。」
              </p>
            </>
          }
        />
      )}
    </div>
  )
}
