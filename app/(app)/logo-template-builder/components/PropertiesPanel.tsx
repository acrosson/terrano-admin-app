'use client'

import { useEditorStore, findElementById } from '../store'
import type { EditorElement, CurvedTextElement, TextElement, GroupElement } from '../types'
import { useFonts } from '../hooks/useFonts'

export function PropertiesPanel () {
  const { document: doc, selectedElementId, updateElement, updateCanvas, setGroupLayout, setGroupCenter } = useEditorStore()
  const { fonts } = useFonts()
  const el = selectedElementId ? findElementById(doc.elements, selectedElementId) : null

  if (!selectedElementId || !el) {
    return (
      <div className="p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Canvas</p>
        <div className="space-y-3">
          <Field label="Width">
            <NumberInput value={doc.canvas.width} onChange={v => updateCanvas({ width: v })} />
          </Field>
          <Field label="Height">
            <NumberInput value={doc.canvas.height} onChange={v => updateCanvas({ height: v })} />
          </Field>
          <Field label="Background">
            <ColorBindInput value={doc.canvas.background} onChange={v => updateCanvas({ background: v })} />
          </Field>
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">Select an element to edit its properties</p>
      </div>
    )
  }

  function patch (p: Partial<EditorElement>) { updateElement(el!.id, p) }

  return (
    <div className="overflow-y-auto p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {el!.type.replace('_', ' ')}
      </p>

      <div className="space-y-3">
        <Field label="Name">
          <TextInput value={el.name ?? ''} onChange={v => patch({ name: v })} placeholder="Optional label" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <NumberInput value={Math.round(el.x)} onChange={v => patch({ x: v })} />
          </Field>
          <Field label="Y">
            <NumberInput value={Math.round(el.y)} onChange={v => patch({ y: v })} />
          </Field>
        </div>
        <Field label="Rotation">
          <NumberInput value={Math.round(el.rotation)} onChange={v => patch({ rotation: v })} />
        </Field>

        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />

        {el.type === 'rect' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width"><NumberInput value={Math.round(el.width)} onChange={v => patch({ width: v })} /></Field>
              <Field label="Height"><NumberInput value={Math.round(el.height)} onChange={v => patch({ height: v })} /></Field>
            </div>
            <Field label="Fill"><ColorBindInput value={el.fill} onChange={v => patch({ fill: v })} /></Field>
            <Field label="Stroke"><ColorBindInput value={el.stroke ?? '#000000'} onChange={v => patch({ stroke: v })} /></Field>
            <Field label="Stroke Width"><NumberInput value={el.strokeWidth ?? 0} onChange={v => patch({ strokeWidth: v })} /></Field>
          </>
        )}

        {el.type === 'circle' && (
          <>
            <Field label="Radius"><NumberInput value={Math.round(el.radius)} onChange={v => patch({ radius: v })} /></Field>
            <Field label="Fill"><ColorBindInput value={el.fill} onChange={v => patch({ fill: v })} /></Field>
            <Field label="Stroke"><ColorBindInput value={el.stroke ?? '#000000'} onChange={v => patch({ stroke: v })} /></Field>
            <Field label="Stroke Width"><NumberInput value={el.strokeWidth ?? 0} onChange={v => patch({ strokeWidth: v })} /></Field>
          </>
        )}

        {el.type === 'line' && (
          <>
            <Field label="Stroke"><ColorBindInput value={el.stroke} onChange={v => patch({ stroke: v })} /></Field>
            <Field label="Stroke Width"><NumberInput value={el.strokeWidth} onChange={v => patch({ strokeWidth: v })} /></Field>
          </>
        )}

        {el.type === 'text' && (
          <>
            <Field label="Bind">
              <select
                value={el.bind ?? ''}
                onChange={e => patch({ bind: e.target.value || undefined } as Partial<EditorElement>)}
                className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
              >
                <option value="">— none —</option>
                <option value="text.wordmark">text.wordmark</option>
                <option value="text.tagline">text.tagline</option>
              </select>
            </Field>
            <Field label="Text">
              <textarea
                value={el.text}
                onChange={e => patch({ text: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
              />
            </Field>
            <Field label="Width"><NumberInput value={Math.round(el.width)} onChange={v => patch({ width: v })} /></Field>
            <Field label="Font Size"><NumberInput value={el.fontSize} onChange={v => patch({ fontSize: v })} /></Field>
            <FontPicker
              fonts={fonts}
              fontFamily={(el as TextElement).fontFamily}
              fontWeight={(el as TextElement).fontWeight}
              fontStyle={(el as TextElement).fontStyle}
              onFamilyChange={v => patch({ fontFamily: v, fontWeight: undefined } as Partial<EditorElement>)}
              onWeightChange={v => patch({ fontWeight: v } as Partial<EditorElement>)}
              onStyleChange={v => patch({ fontStyle: v } as Partial<EditorElement>)}
            />
            <Field label="Fill"><ColorBindInput value={el.fill} onChange={v => patch({ fill: v })} /></Field>
            <Field label="Align">
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => patch({ align: a })}
                    className={`flex-1 rounded py-1 text-xs capitalize ${el.align === a ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {el.type === 'curved_text' && (
          <>
            <Field label="Bind">
              <select
                value={(el as CurvedTextElement).bind ?? ''}
                onChange={e => patch({ bind: e.target.value || undefined } as Partial<EditorElement>)}
                className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
              >
                <option value="">— none —</option>
                <option value="text.wordmark">text.wordmark</option>
                <option value="text.tagline">text.tagline</option>
              </select>
            </Field>
            <Field label="Text">
              <TextInput value={(el as CurvedTextElement).text} onChange={v => patch({ text: v } as Partial<EditorElement>)} />
            </Field>
            <Field label="Radius">
              <NumberInput value={Math.round((el as CurvedTextElement).radius)} onChange={v => patch({ radius: v } as Partial<EditorElement>)} />
            </Field>
            <Field label="Start Angle (°)">
              <NumberInput value={Math.round((el as CurvedTextElement).startAngle)} onChange={v => patch({ startAngle: v } as Partial<EditorElement>)} />
            </Field>
            <Field label="Font Size">
              <NumberInput value={(el as CurvedTextElement).fontSize} onChange={v => patch({ fontSize: v } as Partial<EditorElement>)} />
            </Field>
            <FontPicker
              fonts={fonts}
              fontFamily={(el as CurvedTextElement).fontFamily}
              fontWeight={(el as CurvedTextElement).fontWeight}
              fontStyle={(el as CurvedTextElement).fontStyle}
              onFamilyChange={v => patch({ fontFamily: v, fontWeight: undefined } as Partial<EditorElement>)}
              onWeightChange={v => patch({ fontWeight: v } as Partial<EditorElement>)}
              onStyleChange={v => patch({ fontStyle: v } as Partial<EditorElement>)}
            />
            <Field label="Fill"><ColorBindInput value={(el as CurvedTextElement).fill} onChange={v => patch({ fill: v } as Partial<EditorElement>)} /></Field>
            <Field label="Direction">
              <div className="flex gap-1">
                <button
                  onClick={() => patch({ flipped: false } as Partial<EditorElement>)}
                  className={`flex-1 rounded py-1 text-xs ${!(el as CurvedTextElement).flipped ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                >
                  Top arc
                </button>
                <button
                  onClick={() => patch({ flipped: true } as Partial<EditorElement>)}
                  className={`flex-1 rounded py-1 text-xs ${(el as CurvedTextElement).flipped ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                >
                  Bottom arc
                </button>
              </div>
            </Field>
          </>
        )}

        {el.type === 'icon_placeholder' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width"><NumberInput value={Math.round(el.width)} onChange={v => patch({ width: v })} /></Field>
              <Field label="Height"><NumberInput value={Math.round(el.height)} onChange={v => patch({ height: v })} /></Field>
            </div>
            <Field label="Label"><TextInput value={el.label} onChange={v => patch({ label: v })} /></Field>
            <Field label="Bind">
              <select
                value={el.bind ?? ''}
                onChange={e => patch({ bind: e.target.value || undefined })}
                className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
              >
                <option value="">— none —</option>
                <option value="icon.primary">icon.primary</option>
              </select>
            </Field>
            <p className="text-xs text-zinc-400">Pick an icon in Preview mode</p>
            <Field label="Icon Color"><ColorBindInput value={el.iconColor ?? '#000000'} onChange={v => patch({ iconColor: v })} /></Field>
          </>
        )}

        {el.type === 'group' && (() => {
          const group = el as GroupElement
          const layout = group.layout
          return (
            <>
              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Auto Layout</span>
                <Switch
                  size="sm"
                  isSelected={!!layout}
                  onValueChange={on => setGroupLayout(el.id, on
                    ? { direction: 'vertical', gap: 16, align: 'center', padding: 0 }
                    : undefined
                  )}
                />
              </div>
              {layout && (
                <>
                  <Field label="Direction">
                    <div className="flex gap-1">
                      {(['horizontal', 'vertical'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setGroupLayout(el.id, { ...layout, direction: d })}
                          className={`flex-1 rounded py-1 text-xs capitalize ${layout.direction === d ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Gap">
                    <NumberInput value={layout.gap} onChange={v => setGroupLayout(el.id, { ...layout, gap: v })} />
                  </Field>
                  <Field label="Align">
                    <div className="flex gap-1">
                      {(['start', 'center', 'end'] as const).map(a => (
                        <button
                          key={a}
                          onClick={() => setGroupLayout(el.id, { ...layout, align: a })}
                          className={`flex-1 rounded py-1 text-xs capitalize ${layout.align === a ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Padding">
                    <NumberInput value={layout.padding} onChange={v => setGroupLayout(el.id, { ...layout, padding: v })} />
                  </Field>
                </>
              )}

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Canvas Centering</span>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Center Horizontally</span>
                <Switch
                  size="sm"
                  isSelected={!!group.centerH}
                  onValueChange={on => setGroupCenter(el.id, on, !!group.centerV)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Center Vertically</span>
                <Switch
                  size="sm"
                  isSelected={!!group.centerV}
                  onValueChange={on => setGroupCenter(el.id, !!group.centerH, on)}
                />
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

import type { DesignFont } from '@/lib/api/client'
import { Select, SelectItem, Switch } from '@heroui/react'

function FontPicker ({
  fonts,
  fontFamily,
  fontWeight,
  fontStyle,
  onFamilyChange,
  onWeightChange,
  onStyleChange,
}: {
  fonts: DesignFont[]
  fontFamily: string
  fontWeight?: number
  fontStyle?: string
  onFamilyChange: (v: string) => void
  onWeightChange: (v: number) => void
  onStyleChange: (v: string) => void
}) {
  const selected = fonts.find(f => f.family === fontFamily)

  return (
    <div className="space-y-2">
      <Field label="Font Family">
        <Select
          size="sm"
          aria-label="Font family"
          isLoading={fonts.length === 0}
          selectedKeys={fonts.length > 0 ? [fontFamily] : []}
          onSelectionChange={keys => {
            const val = Array.from(keys)[0] as string
            if (val) onFamilyChange(val)
          }}
          renderValue={items => {
            const item = items[0]
            if (!item) return null
            return (
              <span style={{ fontFamily: item.key as string }}>
                {item.textValue}
              </span>
            )
          }}
          classNames={{ trigger: 'h-8 min-h-8' }}
        >
          {[
            ...fonts.map(f => (
              <SelectItem
                key={f.family}
                textValue={f.family}
              >
                <span style={{ fontFamily: f.family }}>{f.family}</span>
              </SelectItem>
            )),
            <SelectItem key="{font.primary}" textValue="{font.primary}">
              <span className="font-mono text-xs text-zinc-400">{'{font.primary}'}</span>
            </SelectItem>
          ]}
        </Select>
      </Field>

      {selected && (
        <>
          <Field label="Weight">
            <select
              value={fontWeight ?? 400}
              onChange={e => onWeightChange(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
            >
              {selected.weights.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </Field>

          {selected.styles.length > 1 && (
            <Field label="Style">
              <div className="flex gap-1">
                {selected.styles.map(s => (
                  <button
                    key={s}
                    onClick={() => onStyleChange(s)}
                    className={`flex-1 rounded py-1 text-xs capitalize ${(fontStyle ?? 'normal') === s ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </>
      )}
    </div>
  )
}

function Field ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  )
}

function NumberInput ({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
    />
  )
}

function TextInput ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
    />
  )
}

const COLOR_TOKENS = [
  { label: 'Primary', value: '{color.primary}' },
  { label: 'Secondary', value: '{color.secondary}' },
  { label: 'Background', value: '{color.background}' },
]

function ColorBindInput ({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isToken = value.startsWith('{')
  const isTransparent = value === 'transparent'
  const isCustom = !isToken && !isTransparent
  const selectValue = isToken ? value : isTransparent ? 'transparent' : ''

  return (
    <div className="space-y-1.5">
      <select
        value={selectValue}
        onChange={e => {
          const v = e.target.value
          onChange(v === '' ? '#000000' : v)
        }}
        className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-xs focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
      >
        <option value="">— custom color —</option>
        <option value="transparent">Transparent</option>
        {COLOR_TOKENS.map(t => (
          <option key={t.value} value={t.value}>{t.label} ({t.value})</option>
        ))}
      </select>
      {isCustom && <ColorInput value={value} onChange={onChange} />}
      {isTransparent && (
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 dark:border-zinc-600">
          <div
            className="h-4 w-4 rounded-sm border border-zinc-300"
            style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px' }}
          />
          <span className="font-mono text-xs text-zinc-400">transparent</span>
        </div>
      )}
      {isToken && (
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 dark:border-zinc-600">
          <div className="h-4 w-4 rounded-sm border border-zinc-300 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-700" />
          <span className="font-mono text-xs text-zinc-400">{value}</span>
        </div>
      )}
    </div>
  )
}

function ColorInput ({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-zinc-200 p-0.5 dark:border-zinc-600"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 font-mono text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
      />
    </div>
  )
}
