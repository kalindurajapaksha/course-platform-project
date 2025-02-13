"use client";

import { ProductStatus, productStatuses } from "@/drizzle/schema";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { productSchema } from "../schemas/products";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import RequiredLabelIcon from "@/components/RequiredLabelIcon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/custom/multi-select";
import { actionToast } from "@/hooks/use-toast";
import { createProduct, updateProduct } from "../actions/products";

export default function ProductForm({
  product,
  courses,
}: {
  product?: {
    id: string;
    name: string;
    description: string;
    priceInDollars: number;
    imageUrl: string;
    status: ProductStatus;
    courseIds: string[];
  };
  courses: {
    id: string;
    name: string;
  }[];
}) {
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: product ?? {
      name: "",
      description: "",
      priceInDollars: 0,
      imageUrl: "",
      status: "private",
      courseIds: [],
    },
  });
  async function onSubmit(values: z.infer<typeof productSchema>) {
    const action =
      product == null ? createProduct : updateProduct.bind(null, product.id);
    const data = await action(values);
    actionToast({ actionData: data });
  }
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 items-start">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <RequiredLabelIcon />
                  Name
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priceInDollars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <RequiredLabelIcon />
                  Price
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    step={1}
                    min={0}
                    onChange={(e) =>
                      field.onChange(
                        isNaN(e.target.valueAsNumber)
                          ? ""
                          : e.target.valueAsNumber
                      )
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <RequiredLabelIcon />
                  Image Url
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {productStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="courseIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Included Courses</FormLabel>
              <FormControl>
                <MultiSelect
                  selectPlaceholder="Select courses"
                  searchPlaceholder="Search courses"
                  options={courses}
                  getLabel={(c) => c.name}
                  getValue={(c) => c.id}
                  selectedValues={field.value}
                  onSelectedValuesChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <RequiredLabelIcon />
                Description
              </FormLabel>
              <FormControl>
                <Textarea className="min-h-20 resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="self-end">
          <Button disabled={form.formState.isSubmitting} type="submit">
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
