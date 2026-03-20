'use client'

import { useState } from 'react'
import { useEditorStore, findElementById } from '../store'
import type { EditorElement, CurvedTextElement, TextElement, SplitTextElement, SplitTextPart, GroupElement, RectElement, IconPlaceholderElement, PresetIconElement, SizeBind } from '../types'
import { useFonts } from '../hooks/useFonts'
import { IconPickerModal } from './IconPickerModal'
import { designIconUrl } from '@/lib/api/client'
import type { DesignIcon } from '@/lib/api/client'

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
            <SizeBindSection el={el} siblings={getSiblings(doc.elements, el.id)} patch={patch} />
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
                <option value="text.wordmark_part1">text.wordmark_part1</option>
                <option value="text.wordmark_part2">text.wordmark_part2</option>
                <option value="text.tagline">text.tagline</option>
                <option value="text.initials">text.initials</option>
                <option value="text.est_year">text.est_year</option>
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
                <option value="text.wordmark_part1">text.wordmark_part1</option>
                <option value="text.wordmark_part2">text.wordmark_part2</option>
                <option value="text.tagline">text.tagline</option>
                <option value="text.initials">text.initials</option>
                <option value="text.est_year">text.est_year</option>
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

        {el.type === 'split_text' && (() => {
          const st = el as SplitTextElement
          function patchPart (partKey: 'part1' | 'part2', p: Partial<SplitTextPart>) {
            patch({ [partKey]: { ...st[partKey], ...p } } as Partial<EditorElement>)
          }
          const BIND_OPTIONS = [
            { value: '', label: '— none —' },
            { value: 'text.wordmark_part1', label: 'text.wordmark_part1' },
            { value: 'text.wordmark_part2', label: 'text.wordmark_part2' },
            { value: 'text.wordmark', label: 'text.wordmark' },
            { value: 'text.tagline', label: 'text.tagline' },
            { value: 'text.initials', label: 'text.initials' },
            { value: 'text.est_year', label: 'text.est_year' },
          ]
          const selected = fonts.find(f => f.family === st.fontFamily)
          return (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Part 1</p>
              <Field label="Bind">
                <select
                  value={st.part1.bind ?? ''}
                  onChange={e => patchPart('part1', { bind: e.target.value || undefined })}
                  className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
                >
                  {BIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Text">
                <TextInput value={st.part1.text} onChange={v => patchPart('part1', { text: v })} />
              </Field>
              {selected && (
                <>
                  <Field label="Weight">
                    <select
                      value={st.part1.fontWeight ?? 700}
                      onChange={e => patchPart('part1', { fontWeight: Number(e.target.value) })}
                      className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
                    >
                      {selected.weights.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </Field>
                  {selected.styles.length > 1 && (
                    <Field label="Style">
                      <div className="flex gap-1">
                        {selected.styles.map(s => (
                          <button key={s} onClick={() => patchPart('part1', { fontStyle: s })}
                            className={`flex-1 rounded py-1 text-xs capitalize ${(st.part1.fontStyle ?? 'normal') === s ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}
                </>
              )}
              <Field label="Color">
                <ColorBindInput value={st.part1.fill ?? st.fill} onChange={v => patchPart('part1', { fill: v })} />
              </Field>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Part 2</p>
              <Field label="Bind">
                <select
                  value={st.part2.bind ?? ''}
                  onChange={e => patchPart('part2', { bind: e.target.value || undefined })}
                  className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
                >
                  {BIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Text">
                <TextInput value={st.part2.text} onChange={v => patchPart('part2', { text: v })} />
              </Field>
              {selected && (
                <>
                  <Field label="Weight">
                    <select
                      value={st.part2.fontWeight ?? 400}
                      onChange={e => patchPart('part2', { fontWeight: Number(e.target.value) })}
                      className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
                    >
                      {selected.weights.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </Field>
                  {selected.styles.length > 1 && (
                    <Field label="Style">
                      <div className="flex gap-1">
                        {selected.styles.map(s => (
                          <button key={s} onClick={() => patchPart('part2', { fontStyle: s })}
                            className={`flex-1 rounded py-1 text-xs capitalize ${(st.part2.fontStyle ?? 'normal') === s ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}
                </>
              )}
              <Field label="Color">
                <ColorBindInput value={st.part2.fill ?? st.fill} onChange={v => patchPart('part2', { fill: v })} />
              </Field>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Shared</p>
              <Field label="Width"><NumberInput value={Math.round(st.width)} onChange={v => patch({ width: v } as Partial<EditorElement>)} /></Field>
              <Field label="Font Size"><NumberInput value={st.fontSize} onChange={v => patch({ fontSize: v } as Partial<EditorElement>)} /></Field>
              <FontPicker
                fonts={fonts}
                fontFamily={st.fontFamily}
                fontWeight={undefined}
                fontStyle={undefined}
                onFamilyChange={v => patch({ fontFamily: v } as Partial<EditorElement>)}
                onWeightChange={() => {}}
                onStyleChange={() => {}}
              />
              <Field label="Fallback Fill"><ColorBindInput value={st.fill} onChange={v => patch({ fill: v } as Partial<EditorElement>)} /></Field>
              <Field label="Align">
                <div className="flex gap-1">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => patch({ align: a } as Partial<EditorElement>)}
                      className={`flex-1 rounded py-1 text-xs capitalize ${st.align === a ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )
        })()}

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
                <option value="icon.custom_brandmark">icon.custom_brandmark</option>
                <option value="icon.custom_wordmark">icon.custom_wordmark</option>
                <option value="icon.custom_combo">icon.custom_combo</option>
              </select>
            </Field>
            <p className="text-xs text-zinc-400">Pick an icon in Preview mode</p>
            <Field label="Icon Color"><ColorBindInput value={el.iconColor ?? '#000000'} onChange={v => patch({ iconColor: v })} /></Field>
            <SizeBindSection el={el} siblings={getSiblings(doc.elements, el.id)} patch={patch} />
          </>
        )}

        {el.type === 'preset_icon' && (
          <PresetIconSection el={el as PresetIconElement} patch={patch} />
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
                      {(['horizontal', 'vertical', 'stack'] as const).map(d => (
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
                  {layout.direction !== 'stack' && (
                    <Field label="Gap">
                      <NumberInput value={layout.gap} onChange={v => setGroupLayout(el.id, { ...layout, gap: v })} />
                    </Field>
                  )}
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

/** Find sibling elements of a given element (other children of the same parent group). */
function getSiblings (elements: EditorElement[], id: string): EditorElement[] {
  for (const el of elements) {
    if (el.type === 'group') {
      const group = el as GroupElement
      if (group.children.some(c => c.id === id)) {
        return group.children.filter(c => c.id !== id)
      }
      const nested = getSiblings(group.children, id)
      if (nested.length > 0) return nested
    }
  }
  return []
}

function getElementLabel (el: EditorElement): string {
  if (el.name) return el.name
  if (el.type === 'text') return `"${(el as TextElement).text.slice(0, 16)}"`
  if (el.type === 'curved_text') return `"${(el as CurvedTextElement).text.slice(0, 16)}"`
  return el.type.replace('_', ' ')
}

function SizeBindSection ({ el, siblings, patch }: {
  el: RectElement | IconPlaceholderElement
  siblings: EditorElement[]
  patch: (p: Partial<EditorElement>) => void
}) {
  const sizeBind = el.sizeBind

  function updateSizeBind (sb: SizeBind | undefined) {
    patch({ sizeBind: sb } as Partial<EditorElement>)
  }

  return (
    <>
      <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Size Binding</span>
      <Field label="Match size of">
        <select
          value={sizeBind?.targetId ?? ''}
          onChange={e => {
            const targetId = e.target.value
            if (!targetId) {
              updateSizeBind(undefined)
            } else {
              updateSizeBind({
                targetId,
                axis: sizeBind?.axis ?? 'width',
                paddingX: sizeBind?.paddingX ?? 16,
                paddingY: sizeBind?.paddingY ?? 8,
              })
            }
          }}
          className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
        >
          <option value="">— none —</option>
          {siblings.map(s => (
            <option key={s.id} value={s.id}>
              {getElementLabel(s)} ({s.id.slice(0, 6)})
            </option>
          ))}
        </select>
      </Field>
      {sizeBind && (
        <>
          <Field label="Axis">
            <div className="flex gap-1">
              {(['width', 'height', 'both'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => updateSizeBind({ ...sizeBind, axis: a })}
                  className={`flex-1 rounded py-1 text-xs capitalize ${sizeBind.axis === a ? 'bg-primary text-white' : 'border border-zinc-200 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Padding X">
              <NumberInput
                value={sizeBind.paddingX ?? 0}
                onChange={v => updateSizeBind({ ...sizeBind, paddingX: v })}
              />
            </Field>
            <Field label="Padding Y">
              <NumberInput
                value={sizeBind.paddingY ?? 0}
                onChange={v => updateSizeBind({ ...sizeBind, paddingY: v })}
              />
            </Field>
          </div>
        </>
      )}
    </>
  )
}

function PresetIconSection ({ el, patch }: {
  el: PresetIconElement
  patch: (p: Partial<EditorElement>) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  function handleIconSelect (icon: DesignIcon) {
    patch({ iconId: icon.id, iconUrl: designIconUrl(icon) } as Partial<EditorElement>)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width"><NumberInput value={Math.round(el.width)} onChange={v => patch({ width: v })} /></Field>
        <Field label="Height"><NumberInput value={Math.round(el.height)} onChange={v => patch({ height: v })} /></Field>
      </div>
      <Field label="Icon">
        <div className="flex items-center gap-2">
          {el.iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={el.iconUrl}
              alt="preset icon"
              className="h-8 w-8 flex-shrink-0 object-contain dark:invert"
            />
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex-1 rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {el.iconUrl ? 'Change Icon…' : 'Pick Icon…'}
          </button>
        </div>
        <IconPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleIconSelect}
          usageType="TEMPLATE_PRESET"
        />
      </Field>
      <Field label="Icon Color"><ColorBindInput value={el.iconColor ?? '#000000'} onChange={v => patch({ iconColor: v } as Partial<EditorElement>)} /></Field>
    </>
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
