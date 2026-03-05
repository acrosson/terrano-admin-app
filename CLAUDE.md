# Terrano Admin App

## UI Components

**Always prefer HeroUI components** over native HTML elements or custom implementations. The project uses `@heroui/react` throughout.

Key components available:
- Inputs: `Input`, `Textarea`, `InputOtp`, `NumberInput`, `Select`, `SelectItem`
- Buttons: `Button`, `ButtonGroup`
- Layout: `Card`, `CardHeader`, `CardBody`, `CardFooter`, `Divider`
- Feedback: `Spinner`, `Chip`, `Badge`, `Alert`, `Progress`, `CircularProgress`
- Overlay: `Modal`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `Dropdown`, `DropdownTrigger`, `DropdownMenu`, `DropdownItem`, `Popover`, `Drawer`
- Navigation: `Navbar`, `Breadcrumbs`, `Pagination`, `Tabs`
- Display: `User`, `Avatar`, `Image`, `Code`, `Kbd`, `Link`
- Data: `Table`, `Checkbox`, `Radio`, `RadioGroup`, `Switch`

Only fall back to native HTML elements when no suitable HeroUI component exists.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + HeroUI (`@heroui/react`)
- **Markdown**: `react-markdown` + `remark-gfm`

## Code Conventions

- Use `'use client'` directive for client components
- API calls go through `lib/api/client.ts` — add new types and methods there
- Auth utilities live in `lib/utils/auth.ts`
- All pages under `app/(app)/` are protected (require ADMIN or STAFF role)
