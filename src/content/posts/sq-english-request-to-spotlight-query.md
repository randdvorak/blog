---
title: Shining a Spotlight on fine tuning
date: '2026-10-18'
description: >-
  sq is a utility that utilizes a fine tuned qwen2.5-coder model to search macOS
  Spotlight
draft: true
tags:
  - ML
  - AI
  - Spotlight
---
I got very familiar with macOS Spotlight working on the automation of an on demand print service. The ~10TB repository of images we were working with needed to be searched for the images that needed preprocessing before sending them off to their designated print queue. Early on, I discovered just how instrumental Spotlight was to the process.  For instance, in my first iteration of a process just to pull the correct image by filename, I discovered that your standard POSIX find utility just wouldn't cut it. Too slow. Enter Spotlight. If you don't know much about Spotlight and how incredibly useful it is, suffice to say it is an index of the macOS filesystem that is built into macOS. It allows one to search the filesystem by recorded file attributes when the file is saved to the filesystem. In one case, during nightly filesystem synchronization we would receive some images with different color profiles than the standard RGB color profiles. When these files were printed they would come out with wonky colors. So these files had to be isolated and converted before they could be printed. With Spotlight, one could search the index and 'find' those files by hand crafting a Spotlight query syntax command and feed it to the mdfind utility.  Doing this with standard POSIX utilities on a ~10TB RAID containing millions of images would be near impossible in any timely manner. 

When I started on my journey in ML and LLM technology, I decided a good learning project would be an English request to Spotlight query syntax converter. I studied the Spotlight query syntax language, crafted a suitable ABNF grammar, used an ABNF grammar to regex converter and used a utility called exrex to generate random query syntax statements to pair with English requests to generate a dataset suitable for training. This was long before coding agents and life got in the way so the project got dropped. Enter claude. I was able to take the work I had done earlier and have claude pick up where I left off.  I generated a dataset of English queries coupled with query syntax pairs and fine tuned Qwen2.5-Coder-1.5B model and it produced some pretty good results.

sq is the utility that is the product of these efforts. I have (with the help of claude) provided the utility and model to be installed with homebrew on macOS. On an Apple Silicon Mac running macOS 14 or later, install sq with Homebrew by running `brew install randdvorak/sq/sq` in Terminal. Then run `sq "PDFs modified this week"`: the first search downloads the 1 GB model and asks for permission to search your folders, Photos and Mail, so click Allow for anything you want included.  [Github Repo](https://github.com/randdvorak/homebrew-sq)
