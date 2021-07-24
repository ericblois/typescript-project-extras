export type Country = "canada" | "united_states" | ""

export type ShippingInfo = {
    name: string,
    streetAddress: string,
    city: string,
    region: string | null,
    country: string,
    postalCode: string
}

export type OptionSelections = {
  [optionType: string]: {optionName: string, priceChange: number}
}

export type CartItem = {
  businessID: string,
  productID: string,
  productOptions: OptionSelections,
  basePrice: number,
  totalPrice: number,
  quantity: number,
}

export type OrderData = {
  businessID: string,
  userID: string,
  orderID: string,
  cartItems: CartItem[],
  subtotalPrice: number,
  totalPrice: number,
  deliveryMethod: "pickup" | "local" | "country" | "international",
  deliveryPrice: number,
  creationTime: string,
  responseTime: string | null,
  completionTime: string | null,
  status: "pending" | "accepted" | "rejected" | "shipped" | "completed"
}

export type UserData = {
  name: string,
  age: number,
  gender: "male" | "female" | "nonbinary",
  birthDay: string,
  birthMonth: string,
  birthYear: string,
  country: Country,
  shippingAddresses: ShippingInfo[],
  cartItems: CartItem[],
  favorites: string[],
  businessIDs: string[]
}

export const DefaultUserData: UserData = {
  name: "",
  age: 0,
  gender: "male",
  birthDay: "",
  birthMonth: "",
  birthYear: "",
  country: "",
  shippingAddresses: [],
  cartItems: [],
  favorites: [],
  businessIDs: []
}

export type ProductOption = {
  name: string,
  priceChange: number | null,
  images: string[]
}

export const DefaultProductOption = {
  name: "",
  priceChange: null,
  images: []
}

export type ProductOptionType = {
  name: string,
  optional: boolean,
  options: ProductOption[]
}

export const DefaultProductOptionType: ProductOptionType = {
    name: "",
    optional: false,
    options: []
}

export type ProductData = {
  businessID: string,
  productID: string,
  category: string,
  name: string,
  price: number | null,
  description: string,
  images: string[],
  optionTypes: ProductOptionType[],
  ratings: number[],
  extraInfo: string,
  isVisible: boolean
}

export const DefaultProductData = {
  businessID: "",
  productID: "",
  category: "",
  name: "",
  price: null,
  description: "",
  images: [],
  optionTypes: [],
  ratings: [],
  extraInfo: "",
  isVisible: false
}

export type ProductCategory = {
name: string,
productIDs: string[]
}

export type PublicBusinessData = {
  userID: string,
  businessID: string,
  name: string,
  profileImage: string,
  galleryImages: string[],
  businessType: string,
  totalRating: number,
  description: string,
  coords: {latitude: number | null, longitude: number | null},
  address: string,
  city: string,
  region: string,
  country: Country,
  postalCode: string,
  geohash: string,
  deliveryMethods: {
    pickup: boolean,
    local: boolean,
    country: boolean,
    international: boolean
  },
  localDeliveryRange: number,
  keywords: string[],
  productList: ProductCategory[],
}

export const DefaultPublicBusinessData: PublicBusinessData = {
  userID: "",
  businessID: "",
  name: "",
  profileImage: "",
  galleryImages: [],
  businessType: "",
  totalRating: 0,
  description: "",
  coords: {latitude: null, longitude: null},
  address: "",
  city: "",
  region: "",
  country: "",
  postalCode: "",
  geohash: "",
  deliveryMethods: {
    pickup: false,
    local: false,
    country: false,
    international: false
  },
  localDeliveryRange: 0,
  keywords: [],
  productList: [],
}

export type PrivateBusinessData = {
  userID: string,
  businessID: string,
  country: Country,
  coords: {latitude: number, longitude: number},
}

export const DefaultPrivateBusinessData: PrivateBusinessData = {
  userID: "",
  businessID: "",
  country: "",
  coords: {latitude: 0, longitude: 0},
}