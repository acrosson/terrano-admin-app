'use client'

import Link from 'next/link'
import { Breadcrumbs, BreadcrumbItem, Card, CardBody } from '@heroui/react'

const sections = [
  {
    href: '/design/templates',
    title: 'Design Templates',
    description: 'Manage logo and design templates used to generate projects.',
  },
  {
    href: '/design/requests',
    title: 'Design Requests',
    description: 'View all design requests and preview generated logo projects.',
  },
]

export default function DesignPage () {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs>
          <BreadcrumbItem>Design</BreadcrumbItem>
        </Breadcrumbs>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Design</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage templates and review design requests</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map(s => (
          <Card
            key={s.href}
            as={Link}
            href={s.href}
            isPressable
            shadow="sm"
            className="border border-zinc-200 dark:border-zinc-700"
          >
            <CardBody className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{s.title}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{s.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
