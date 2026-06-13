import React from 'react'
import { Laptop, Briefcase, Smartphone, Headphones, Book, BedDouble, Plug, Shirt, Coffee, Pen, Lightbulb, Battery, Backpack, Scissors, Watch, Star } from 'lucide-react'

export const ICONS = {
  Laptop, Briefcase, Smartphone, Headphones, Book, BedDouble, Plug, Shirt, Coffee, Pen, Lightbulb, Battery, Backpack, Scissors, Watch, Star
}

export default function GearIcon({ name, className }) {
  const IconComponent = ICONS[name] || Star
  return <IconComponent className={className} />
}
