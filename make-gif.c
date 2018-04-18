#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gifenc.h"

typedef struct __attribute__((__packed__)) Update {
  uint8_t x;
  uint8_t y;
  uint8_t c;
  double t;
} Update;

static uint8_t palette[] = {
  0, 0, 0,
  34, 32, 52,
  69, 40, 60,
  102, 57, 49,
  143, 86, 59,
  223, 113, 38,
  217, 160, 102,
  238, 195, 154,
  251, 242, 54,
  153, 229, 80,
  106, 190, 48,
  55, 148, 110,
  75, 105, 47,
  82, 75, 36,
  50, 60, 57,
  63, 63, 116,
  48, 96, 130,
  91, 110, 225,
  99, 155, 255,
  95, 205, 228,
  203, 219, 252,
  255, 255, 255,
  155, 173, 183,
  132, 126, 135,
  105, 106, 106,
  89, 86, 82,
  118, 66, 138,
  172, 50, 50,
  217, 87, 99,
  215, 123, 186,
  143, 151, 74,
  138, 111, 48,
};





int main(int argc, char **argv) {
  if (argc < 4) {
    fprintf(stderr, "Usage: ./make-gif <time-lapse-file> <output-gif-file> <period in seconds, eg 30>\n");
    return 1;
  }

  int period = atoi(argv[3]);
  printf("Using period %d\n", period);

  FILE *file = fopen(argv[1], "r");

  fseek(file, 0, SEEK_END);
  long count = ftell(file) / sizeof(Update);
  fseek(file, 0, SEEK_SET);

  struct Update *updates = malloc(sizeof(Update) * count);

  fread(updates, sizeof(Update), count, file);
  fclose(file);

  ge_GIF *gif = ge_new_gif(
    argv[2],
    1000, 1000,
    palette, 5,
    0
  );

  uint8_t *blank = calloc(1000 * 1000, 1);

  double last = 0;
  int changes = 0;

  for (int i = 0; i < count; i++) {
    memcpy(gif->frame, blank, 1000 * 1000);

    struct Update update = updates[i];
    double t = update.t;

    for (int j = 0; j <= i; j++) {
      struct Update update = updates[j];
      uint8_t x = update.x;
      uint8_t y = update.y;
      uint8_t c = update.c;

      for (int y2 = 0; y2 < 10; y2++) {
        for (int x2 = 0; x2 < 10; x2++) {
          gif->frame[(y * 10 + y2) * 1000 + (x * 10 + x2)] = c;
        }
      }
    }

    printf(".", i);
    changes++;
    if (i == count - 1 || t - last > 1000.0 * period) {
      printf("\nAdding frame for period of %.0f seconds with %d changes\n", (t - last) / 1000.0, changes);
      ge_add_frame(gif, 1);
      last = t;
      changes = 0;
    }
  }

  ge_add_frame(gif, 1000);
  ge_close_gif(gif);

  return 0;
}