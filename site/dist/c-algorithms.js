/* ANSI C89 templates. double preserves the lab's decimal inputs. */
export const cSources = {
quick: `/* Sort ascending in place. Keep this function signature. */
static void quick(double a[], int left, int right)
{
    int i, j;
    double pivot, temp;
    if (left >= right) return;
    pivot = a[left + (right - left) / 2];
    i = left;
    j = right;
    while (i <= j) {
        while (a[i] < pivot) i++;
        while (a[j] > pivot) j--;
        if (i <= j) {
            temp = a[i]; a[i] = a[j]; a[j] = temp;
            i++; j--;
        }
    }
    if (left < j) quick(a, left, j);
    if (i < right) quick(a, i, right);
}

void sort(double input[], int n)
{
    quick(input, 0, n - 1);
}`,
merge: `#include <stdlib.h>

static void merge_sort(double a[], double temp[], int lo, int hi)
{
    int mid, i, j, k;
    if (hi - lo <= 1) return;
    mid = lo + (hi - lo) / 2;
    merge_sort(a, temp, lo, mid);
    merge_sort(a, temp, mid, hi);
    i = lo; j = mid; k = lo;
    while (i < mid && j < hi) {
        if (a[i] <= a[j]) temp[k++] = a[i++];
        else temp[k++] = a[j++];
    }
    while (i < mid) temp[k++] = a[i++];
    while (j < hi) temp[k++] = a[j++];
    for (k = lo; k < hi; k++) a[k] = temp[k];
}

void sort(double input[], int n)
{
    double *temp;
    if (n < 2) return;
    temp = (double *)malloc(n * sizeof(double));
    if (temp == NULL) return;
    merge_sort(input, temp, 0, n);
    free(temp);
}`,
bubble: `void sort(double input[], int n)
{
    int end, i, swapped;
    double temp;
    for (end = n - 1; end > 0; end--) {
        swapped = 0;
        for (i = 0; i < end; i++) {
            if (input[i] > input[i + 1]) {
                temp = input[i];
                input[i] = input[i + 1];
                input[i + 1] = temp;
                swapped = 1;
            }
        }
        /* Stop early if this pass made no swaps. */
        if (!swapped) break;
    }
}`,
insertion: `void sort(double input[], int n)
{
    int i, j;
    double value;
    for (i = 1; i < n; i++) {
        value = input[i];
        j = i - 1;
        while (j >= 0 && input[j] > value) {
            input[j + 1] = input[j];
            j--;
        }
        input[j + 1] = value;
    }
}`,
selection: `void sort(double input[], int n)
{
    int i, j, smallest;
    double temp;
    for (i = 0; i < n - 1; i++) {
        smallest = i;
        for (j = i + 1; j < n; j++) {
            if (input[j] < input[smallest]) smallest = j;
        }
        if (smallest != i) {
            temp = input[i];
            input[i] = input[smallest];
            input[smallest] = temp;
        }
    }
}`,
heap: `static void sift(double a[], int n, int root)
{
    int largest, left, right;
    double temp;
    for (;;) {
        largest = root;
        left = 2 * root + 1;
        right = left + 1;
        if (left < n && a[left] > a[largest]) largest = left;
        if (right < n && a[right] > a[largest]) largest = right;
        if (largest == root) return;
        temp = a[root]; a[root] = a[largest]; a[largest] = temp;
        root = largest;
    }
}

void sort(double input[], int n)
{
    int i, end;
    double temp;
    for (i = n / 2 - 1; i >= 0; i--) sift(input, n, i);
    for (end = n - 1; end > 0; end--) {
        temp = input[0]; input[0] = input[end]; input[end] = temp;
        sift(input, end, 0);
    }
}`
};
export const C_FLAGS = '-std=c89 -pedantic-errors -O2';
export const C_COMPILER = 'Clang 8.0.1 / wasm-clang 648c4a8';
