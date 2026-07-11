'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type FilterValues = {
  search?: string
  category?: string
  city?: string
  when?: string
  price?: string
}

const ANY = 'any'

export function EventFilters({ initial }: { initial: FilterValues }) {
  const router = useRouter()
  const [search, setSearch] = useState(initial.search ?? '')
  const [category, setCategory] = useState(initial.category ?? '')
  const [city, setCity] = useState(initial.city ?? '')
  const [when, setWhen] = useState(initial.when ?? ANY)
  const [price, setPrice] = useState(initial.price ?? ANY)

  function apply(e: React.FormEvent) {
    e.preventDefault()
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (category) q.set('category', category)
    if (city) q.set('city', city)
    if (when !== ANY) q.set('when', when)
    if (price !== ANY) q.set('price', price)
    router.push(`/events?${q.toString()}`)
  }

  function reset() {
    setSearch('')
    setCategory('')
    setCity('')
    setWhen(ANY)
    setPrice(ANY)
    router.push('/events')
  }

  return (
    <form onSubmit={apply} className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="f-search">Search</Label>
        <Input id="f-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Keyword" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-category">Category</Label>
        <Input id="f-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Any" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-city">City</Label>
        <Input id="f-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Any" />
      </div>
      <div className="space-y-1">
        <Label>When</Label>
        <Select value={when} onValueChange={(v) => setWhen(v ?? ANY)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any time</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Price</Label>
        <Select value={price} onValueChange={(v) => setPrice(v ?? ANY)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </form>
  )
}
