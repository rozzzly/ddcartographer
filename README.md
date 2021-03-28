
## `ddcartographer`: a tool to help generate targeted map/domain files for use with [ddrescue](https://www.gnu.org/software/ddrescue/).


[ddrutility](https://sourceforge.net/projects/ddrutility/) and [partclone](https://partclone.org/) are able to do something very similar, but AFAICT—there's not a lot of documentation, they rely on being able to decipher the $MFT and $Bitmap files along with other esoteric metadata which may/or may not be readable/completely valid.

I know the offsets of the files I want (via DMDE) but those tools can't don't allow me to easily copy paste a list and get a custom mapfile. That's what this package is for. **`ddcartographer` makes the assumption you know the offset and size (in bytes) of the files you want are located.** You feed it into `ddcartographer`, and it gives you a custom mapfile. Eventually, I hope to expose configurability to make it easy to generate mapfiles of any kind you want programmatically.

This is very much a work in progress. Don't blame me if you break something using this :wink: